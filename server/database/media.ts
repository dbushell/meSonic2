import * as log from 'log';
import * as path from 'path';
import * as db from './mod.ts';
import * as env from '../library/env.ts';
import {
  Artist,
  Album,
  Song,
  ArtistEntry,
  AlbumEntry,
  SongEntry
} from '../types.ts';

const emoji = '📚';

// File extensions to consider as audio when syncing media
const EXTENSIONS = ['mp3', 'm4b'];

// Directory names must begin with `[A-Za-z0-9_]` character class
const DIR = /^\w/;

// File names must end with extension and not begin "." or "_"
const FILE = new RegExp(`^(?!\\.|_).*\\.(${EXTENSIONS.join('|')})$`);

// # Returns: duration string in form "S.SS s", "H:MM:SS" or "DD days HH:MM:SS"
const DURATION = /^(?:(\d{1,2}) days? )?(\d{1,2}):(\d{1,2}):(\d{1,2})/;
const SECONDS = /^(\d{1,2}\.\d{1,2})/;

// Return list of matching directories in path
export const getDirs = async (root: string) => {
  const paths = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isDirectory && DIR.test(entry.name)) {
      paths.push(path.join(root, entry.name));
    }
  }
  return paths;
};

// Return list of matching files in path
export const getFiles = async (root: string) => {
  const paths = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isFile && FILE.test(entry.name)) {
      paths.push(path.join(root, entry.name));
    }
  }
  return paths;
};

// Return nested array of artist, album, and song entries
export const getLibrary = async (root: string): Promise<ArtistEntry[]> => {
  const mapSongs = (song: string) =>
    ({
      path: song,
      name: path.parse(song).name
    } as SongEntry);
  const mapAlbums = async (album: string) =>
    ({
      path: album,
      name: path.basename(album),
      songs: await Promise.all((await getFiles(album)).map(mapSongs))
    } as AlbumEntry);
  const mapArtists = async (artist: string) =>
    ({
      path: artist,
      name: path.basename(artist),
      albums: await Promise.all((await getDirs(artist)).map(mapAlbums))
    } as ArtistEntry);
  const dirs = await getDirs(root);
  return Promise.all(dirs.map(mapArtists));
};

// Find or add artist to database
export const findArtist = (entry: ArtistEntry, artists: Artist[]) => {
  const artist = artists.find(
    (a) => a.name === entry.name && a.path === entry.path
  );
  if (artist) return artist;
  const id = db.addArtist({
    name: entry.name,
    path: entry.path
  });
  if (id) return db.getArtist({id})[0];
  throw new Error(`Find artist "${entry.path}"`);
};

// Find or add album to database
export const findAlbum = (
  entry: AlbumEntry,
  albums: Album[],
  artist: Artist
) => {
  const album = albums.find(
    (a) => a.name === entry.name && a.path === entry.path
  );
  if (album) return album;
  const id = db.addAlbum({
    artist_id: artist.id,
    name: entry.name,
    path: entry.path
  });
  if (id) return db.getAlbum({id})[0];
  throw new Error(`Find album "${entry.path}"`);
};

// Find or add song to database
export const findSong = async (
  entry: SongEntry,
  songs: Song[],
  artist: Artist,
  album: Album
) => {
  const song = songs.find(
    (s) => s.name === entry.name && s.path === entry.path
  );
  if (song) return song;
  try {
    const stat = await Deno.stat(entry.path);
    const command = new Deno.Command('exiftool', {
      args: ['-j', '-Duration', '-MIMEType', `${entry.path}`]
    });
    const {code, stdout} = await command.output();
    if (code !== 0) return false;
    const exif = JSON.parse(new TextDecoder().decode(stdout));
    const mimetype = String(exif[0].MIMEType).trim();
    if (!mimetype) {
      throw new Error(`no MIMEType / Duration "${entry.path}"`);
    }
    const exitDuration = String(exif[0].Duration).trim();
    let duration = 0;
    let parts = DURATION.exec(exitDuration);
    if (parts) {
      const [, dd, hh, mm, ss] = parts;
      duration =
        Number(ss ?? 0) +
        Number(mm ?? 0) * 60 +
        Number(hh ?? 0) * 3600 +
        Number(dd ?? 0) * 86400;
    } else {
      parts = SECONDS.exec(exitDuration);
      if (parts) {
        const [, ss] = parts;
        duration = Math.round(Number(ss ?? 0));
      }
    }
    if (!duration) {
      throw new Error(`no Duration "${entry.path}"`);
    }
    const id = db.addSong({
      artist_id: artist.id,
      album_id: album.id,
      name: entry.name,
      path: entry.path,
      mimetype,
      duration,
      size: stat.size
    });
    if (id) return db.getSong({id})[0];
    throw new Error(`Find song "${entry.path}"`);
  } catch (err) {
    log.error(err);
  }
};

export const syncMedia = async () => {
  const artists = db.getArtist();
  const library = await getLibrary(env.get('MEDIA_DIR'));
  log.info(`${emoji} Artists ${artists.length} (db) ${library.length} (fs)`);

  for (const entry of library) {
    const artist = findArtist(entry, artists);
    const albums = db.getAlbum({artist_id: artist.id});
    for (const albumEntry of entry.albums) {
      const album = findAlbum(albumEntry, albums, artist);
      const songs = db.getSong({
        artist_id: artist.id,
        album_id: album.id
      });
      for (const songEntry of albumEntry.songs) {
        await findSong(songEntry, songs, artist, album);
      }
    }
  }
  // TODO: fix race condition with events?
  // Cleanup missing artists
  for (const artist of db.getArtist()) {
    try {
      const stat = await Deno.lstat(artist.path);
      if (!stat.isDirectory) throw new Error();
    } catch {
      db.removeArtist(artist.id);
    }
  }
  // Delete missing albums
  for (const album of db.getAlbum()) {
    try {
      const stat = await Deno.lstat(album.path);
      if (!stat.isDirectory) throw new Error();
    } catch {
      db.removeAlbum(album.id);
    }
  }
  // Delete missing songs
  for (const song of db.getSong()) {
    try {
      const stat = await Deno.lstat(song.path);
      if (!stat.isFile) throw new Error();
    } catch {
      db.removeSong(song.id);
    }
  }
  // TODO: is this necessary?
  // // Delete orphaned albums and songs
  // await db.deleteOrphans();
};
