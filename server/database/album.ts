import * as log from 'log';
import * as uuid from 'uuid';
import {BindValue} from 'sqlite3';
import {db, getArtist, getSong} from './mod.ts';
import {Artist, Album, GetAlbum, AddAlbum} from '../types.ts';
import {naturalSort} from './shared.ts';

const emoji = '💿 ';

export const getAlbum = (params: GetAlbum = {}): Album[] => {
  if (params.id && !uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return [];
  }
  if (params.artist_id && !uuid.validate(params.artist_id)) {
    log.warning(`${emoji} Invalid artist ID (${params.artist_id})`);
    return [];
  }
  try {
    let sql =
      'SELECT albums.*,\
    (SELECT COUNT(*) FROM songs WHERE album_id=albums.id) AS song_count\
    FROM albums';
    if (params.id) {
      sql += ' WHERE albums.id=:id LIMIT 1';
    } else if (params.path) {
      sql += ' WHERE albums.path=:path LIMIT 1';
    } else {
      if (params.artist_id) {
        sql += ' WHERE albums.artist_id=:artist_id';
      }
      sql += ' ORDER BY albums.name ASC';
    }
    const {artists, songs, bookmarks} = params;
    delete params.artists;
    delete params.songs;
    delete params.bookmarks;
    const query = db.prepare(sql);
    const albums = query.all<Album>(params as Record<string, BindValue>);
    if (artists) {
      for (const album of albums) {
        album.artist = getArtist({id: album.artist_id})[0];
      }
    }
    if (songs) {
      for (const album of albums) {
        album.songs = getSong({album_id: album.id, bookmarks});
      }
    }
    naturalSort<Album>(albums);
    return albums;
  } catch (err) {
    log.error(err);
    return [];
  }
};

export const addAlbum = ({artist_id, name, path}: AddAlbum): string => {
  if (!uuid.validate(artist_id)) {
    log.warning(`${emoji} Invalid artist ID (${artist_id})`);
    return '';
  }
  try {
    const albums = getArtist({path});
    if (albums.length > 0) return albums[0].id;
    const query = db.prepare(
      'INSERT INTO albums (id, artist_id, name, path) \
      VALUES (:id, :artist_id, :name, :path)'
    );
    const id = crypto.randomUUID();
    const changes = query.run({id, artist_id, name, path});
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Album>('album:add', {detail: getAlbum({id})[0]})
      );
    }
    return changes ? id : '';
  } catch (err) {
    log.error(err);
    return '';
  }
};

export const removeAlbum = (id: string): boolean => {
  if (!uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  try {
    const albums = getAlbum({id});
    if (!albums.length) return false;
    const query = db.prepare('DELETE FROM albums WHERE id=:id');
    const changes = query.run({id});
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Album>('album:remove', {detail: albums[0]})
      );
    }
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

addEventListener('album:add', ((event: CustomEvent<Album>) => {
  const album = event.detail;
  log.warning(`${emoji} Add album (${album.name})`);
}) as EventListener);

addEventListener('album:remove', ((event: CustomEvent<Album>) => {
  const album = event.detail;
  log.warning(`${emoji} Remove album (${album.name})`);
}) as EventListener);

addEventListener('artist:remove', ((event: CustomEvent<Artist>) => {
  const artist = event.detail;
  const albums = getAlbum({id: artist.id});
  albums.forEach((album) => removeAlbum(album.id));
}) as EventListener);
