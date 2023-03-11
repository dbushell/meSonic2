import * as log from 'log';
import * as uuid from 'uuid';
import {BindValue} from 'sqlite3';
import {db, getAlbum} from './mod.ts';
import {Artist, GetArtist, AddArtist} from '../types.ts';
import {naturalSort} from './shared.ts';

const emoji = '🎨 ';

export const getArtist = (params: GetArtist = {}): Artist[] => {
  if (params.id && !uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return [];
  }
  try {
    let sql =
      'SELECT artists.*,\
    (SELECT COUNT(*) FROM albums WHERE artist_id=artists.id) AS album_count\
    FROM artists';
    if (params.id) {
      sql += ' WHERE artists.id=:id LIMIT 1';
    } else if (params.path) {
      sql += ' WHERE artists.path=:path LIMIT 1';
    } else {
      sql += ' ORDER BY artists.name ASC';
    }
    const {albums, songs} = params;
    delete params.albums;
    delete params.songs;
    const query = db.prepare(sql);
    const artists = query.all<Artist>(params as Record<string, BindValue>);
    if (albums) {
      for (const artist of artists) {
        artist.albums = getAlbum({artist_id: artist.id, songs}) ?? [];
      }
    }
    naturalSort(artists);
    return artists;
  } catch (err) {
    log.error(err);
    return [];
  }
};

export const addArtist = ({name, path}: AddArtist): string => {
  try {
    const artists = getArtist({path});
    if (artists.length > 0) return artists[0].id;
    const query = db.prepare(
      'INSERT INTO artists (id, name, path) VALUES (:id, :name, :path)'
    );
    const id = crypto.randomUUID();
    const changes = query.run({id, name, path});
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Artist>('artist:add', {detail: getArtist({id})[0]})
      );
    }
    return changes ? id : '';
  } catch (err) {
    log.error(err);
    return '';
  }
};

export const removeArtist = (id: string): boolean => {
  if (!uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  try {
    const artists = getArtist({id});
    if (!artists.length) return false;
    const query = db.prepare('DELETE FROM artists WHERE id=:id');
    const changes = query.run({id});
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Artist>('artist:remove', {detail: artists[0]})
      );
    }
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

addEventListener('artist:add', ((event: CustomEvent<Artist>) => {
  const artist = event.detail;
  log.warning(`${emoji} Add artist (${artist.name})`);
}) as EventListener);

addEventListener('artist:remove', ((event: CustomEvent<Artist>) => {
  const artist = event.detail;
  log.warning(`${emoji} Remove artist (${artist.name})`);
}) as EventListener);
