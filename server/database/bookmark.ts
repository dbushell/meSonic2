import * as log from 'log';
import * as uuid from 'uuid';
import {db, getSong, getEpisode} from './mod.ts';
import type {BindValue} from 'sqlite3';
import type {
  Bookmark,
  GetBookmark,
  AddBookmark,
  RemoveBookmark,
  UpdateBookmark,
  Episode,
  Song
} from '../types.ts';

const emoji = '🔖';

export const getBookmark = (params: GetBookmark = {}): Bookmark[] => {
  if (params.id && !uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return [];
  }
  if (params.parent_id && !uuid.validate(params.parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${params.parent_id})`);
    return [];
  }
  try {
    let sql = 'SELECT * FROM bookmarks';
    if (params.id) {
      sql += ' WHERE id=:id LIMIT 1';
    } else if (params.parent_id) {
      sql +=
        ' WHERE parent_id=:parent_id \
        ORDER BY datetime(modified_at) DESC';
    } else {
      sql += ' ORDER BY datetime(modified_at) DESC';
    }
    const {songs, albums, artists, episodes, podcasts} = params;
    delete params.songs;
    delete params.albums;
    delete params.artists;
    delete params.episodes;
    delete params.podcasts;
    const query = db.prepare(sql);
    const bookmarks = query.all<Bookmark>(params as Record<string, BindValue>);
    for (const bookmark of bookmarks) {
      if (songs && bookmark.parent_type === 'song') {
        bookmark.parent = getSong({id: bookmark.parent_id, albums, artists})[0];
      }
      if (episodes && bookmark.parent_type === 'episode') {
        bookmark.parent = getEpisode({id: bookmark.parent_id, podcasts})[0];
      }
    }
    return bookmarks;
  } catch (err) {
    log.error(err);
    return [];
  }
};

export const addBookmark = ({
  parent_id,
  parent_type,
  position
}: AddBookmark): boolean => {
  if (!uuid.validate(parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${parent_id})`);
    return false;
  }
  try {
    const bookmarks = getBookmark({parent_id});
    if (bookmarks.length > 0) {
      return updateBookmark({
        id: bookmarks[0].id,
        position
      });
    }
    log.getLogger('debug').debug(`${emoji} Add bookmark (for ${parent_id})`);
    const query = db.prepare(
      'INSERT INTO bookmarks (id, parent_id, parent_type, position) \
        VALUES (:id, :parent_id, :parent_type, :position)'
    );
    const id = crypto.randomUUID();
    const changes = query.run({
      id,
      parent_id,
      parent_type,
      position
    });
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const removeBookmark = ({id, parent_id}: RemoveBookmark): boolean => {
  if (!id && !parent_id) {
    return false;
  }
  if (id && !uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  if (parent_id && !uuid.validate(parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${id})`);
    return false;
  }
  try {
    let bookmarks: Bookmark[] = [];
    if (id) {
      bookmarks = getBookmark({id});
    } else if (parent_id) {
      bookmarks = getBookmark({parent_id});
    }
    if (!bookmarks.length) return false;
    log
      .getLogger('debug')
      .debug(`${emoji} Remove bookmark (for ${bookmarks[0].parent_id})`);
    bookmarks.forEach((bookmark) => {
      const query = db.prepare('DELETE FROM bookmarks WHERE id=:id');
      query.run({id: bookmark.id});
    });
    return true;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const updateBookmark = (params: UpdateBookmark): boolean => {
  if (!uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return false;
  }
  try {
    log.getLogger('debug').debug(`${emoji} Update bookmark (${params.id})`);
    const bookmarks = getBookmark({id: params.id});
    if (!bookmarks.length) return false;
    const bookmark = {
      ...bookmarks[0],
      ...params,
      modified_at: new Date().toISOString()
    };
    const query = db.prepare(
      'UPDATE bookmarks\
      SET modified_at=:modified_at, position=:position\
      WHERE id=:id'
    );
    const changes = query.run({
      id: bookmark.id,
      modified_at: bookmark.modified_at,
      position: bookmark.position
    });
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const cleanupBookmarks = () => {
  const bookmarks = getBookmark({
    songs: true,
    albums: true,
    artists: true,
    episodes: true,
    podcasts: true
  });
  bookmarks.forEach((bookmark) => {
    if (!bookmark.parent) {
      removeBookmark({id: bookmark.id});
    }
    if (bookmark.parent_type === 'song') {
      const parent = bookmark.parent as Song;
      if (!parent?.album || !parent?.artist) {
        removeBookmark({id: bookmark.id});
      }
    }
    if (bookmark.parent_type === 'episode') {
      const parent = bookmark.parent as Episode;
      if (!parent?.parent) {
        removeBookmark({id: bookmark.id});
      }
    }
  });
};

addEventListener('episode:remove', ((event: CustomEvent<Episode>) => {
  const episode = event.detail;
  const bookmarks = getBookmark({parent_id: episode.id});
  bookmarks.forEach((bookmark) => {
    removeBookmark({id: bookmark.id});
  });
}) as EventListener);
