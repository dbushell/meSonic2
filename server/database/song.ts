import * as log from 'log';
import * as uuid from 'uuid';
import {BindValue} from 'sqlite3';
import {db, getArtist, getAlbum, getBookmark} from './mod.ts';
import {Artist, Album, Song, GetSong, AddSong} from '../types.ts';
import {naturalSort} from './shared.ts';

const emoji = '🎧 ';

export const getSong = (params: GetSong = {}): Song[] => {
  if (params.id && !uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return [];
  }
  if (params.artist_id && !uuid.validate(params.artist_id)) {
    log.warning(`${emoji} Invalid artist ID (${params.artist_id})`);
    return [];
  }
  if (params.album_id && !uuid.validate(params.album_id)) {
    log.warning(`${emoji} Invalid album ID (${params.album_id})`);
    return [];
  }
  try {
    let sql = 'SELECT * FROM songs';
    if (params.id) {
      sql += ' WHERE id=:id LIMIT 1';
    } else if (params.path) {
      sql += ' WHERE path=:path LIMIT 1';
    } else {
      if (params.artist_id && params.album_id) {
        sql += ' WHERE artist_id=:artist_id AND album_id=:album_id';
      } else if (params.artist_id) {
        sql += ' WHERE artist_id=:artist_id';
      } else if (params.album_id) {
        sql += ' WHERE album_id=:album_id';
      }
      sql += ' ORDER BY name ASC';
    }
    const {artists, albums, bookmarks} = params;
    delete params.artists;
    delete params.albums;
    delete params.bookmarks;
    const query = db.prepare(sql);
    const songs = query.all<Song>(params as Record<string, BindValue>);
    if (artists) {
      for (const song of songs) {
        song.artist = getArtist({id: song.artist_id})[0];
      }
    }
    if (albums) {
      for (const song of songs) {
        song.album = getAlbum({id: song.album_id})[0];
      }
    }
    if (bookmarks) {
      for (const song of songs) {
        song.bookmarks = getBookmark({parent_id: song.id});
      }
    }
    songs.forEach(song => {
      song.duration = song.duration / 1000;
    });
    naturalSort<Song>(songs);
    return songs;
  } catch (err) {
    log.error(err);
    return [];
  }
};

export const addSong = ({
  artist_id,
  album_id,
  name,
  path,
  mimetype,
  duration,
  size
}: AddSong): string => {
  if (!uuid.validate(artist_id)) {
    log.warning(`${emoji} Invalid artist ID (${artist_id})`);
    return '';
  }
  if (!uuid.validate(album_id)) {
    log.warning(`${emoji} Invalid album ID (${album_id})`);
    return '';
  }
  try {
    const songs = getArtist({path});
    if (songs.length > 0) return songs[0].id;
    const query = db.prepare(
      'INSERT INTO songs (id, artist_id, album_id, name, path, mimetype, duration, size) \
      VALUES (:id, :artist_id, :album_id, :name, :path, :mimetype, :duration, :size)'
    );
    const id = crypto.randomUUID();
    const changes = query.run({
      id,
      artist_id,
      album_id,
      name,
      path,
      mimetype,
      duration,
      size
    });
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Song>('song:add', {detail: getSong({id})[0]})
      );
    }
    return changes ? id : '';
  } catch (err) {
    log.error(err);
    return '';
  }
};

export const removeSong = (id: string): boolean => {
  if (!uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  try {
    const songs = getSong({id});
    if (!songs.length) return false;
    const query = db.prepare('DELETE FROM songs WHERE id=:id');
    const changes = query.run({id});
    if (changes > 0) {
      dispatchEvent(new CustomEvent<Song>('song:remove', {detail: songs[0]}));
    }
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

addEventListener('song:add', ((event: CustomEvent<Song>) => {
  const song = event.detail;
  log.info(`${emoji} Add song (${song.name})`);
}) as EventListener);

addEventListener('song:remove', ((event: CustomEvent<Song>) => {
  const song = event.detail;
  log.warning(`${emoji} Remove song (${song.name})`);
}) as EventListener);

addEventListener('artist:remove', ((event: CustomEvent<Artist>) => {
  const artist = event.detail;
  const songs = getSong({artist_id: artist.id});
  songs.forEach((songs) => removeSong(songs.id));
}) as EventListener);

addEventListener('album:remove', ((event: CustomEvent<Album>) => {
  const album = event.detail;
  const songs = getSong({album_id: album.id});
  songs.forEach((songs) => removeSong(songs.id));
}) as EventListener);
