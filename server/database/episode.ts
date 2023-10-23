import * as log from 'log';
import * as uuid from 'uuid';
import * as cache from '../cache/mod.ts';
import {db, getBookmark, getPodcast, getMetadata} from './mod.ts';
import type {BindValue} from 'sqlite3';
import type {
  Episode,
  AddEpisode,
  GetEpisode,
  UpdateEpisode,
  Podcast
} from '../types.ts';

const emoji = '🎤';

export const getEpisodeTransient = async (
  episode: Episode[]
): Promise<void> => {
  const promises = episode.map(async (e) => {
    const entry = await cache.check(new URL(e.url));
    if (entry === null) return;
    const now = new Date().toISOString();
    e.metadata = [
      ...(e.metadata ?? []),
      {
        id: crypto.randomUUID(),
        created_at: now,
        modified_at: now,
        parent_id: e.id,
        parent_type: 'transient',
        key: 'cached',
        value: entry.created
      }
    ];
  });
  await Promise.all(promises);
};

export const getEpisode = (params: GetEpisode = {}): Episode[] => {
  if (params.id && !uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return [];
  }
  if (params.parent_id && !uuid.validate(params.parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${params.parent_id})`);
    return [];
  }
  try {
    let sql = 'SELECT * FROM episodes';
    if (params.id) {
      sql += ' WHERE id=:id LIMIT 1';
    } else if (params.url) {
      sql += ' WHERE url=:url LIMIT 1';
    } else if (params.parent_id) {
      sql +=
        ' WHERE parent_id=:parent_id \
        ORDER BY datetime(modified_at) DESC';
    }
    const {podcasts, bookmarks, metadata} = params;
    delete params.podcasts;
    delete params.bookmarks;
    delete params.metadata;
    const query = db.prepare(sql);
    const episodes = query.all<Episode>(params as Record<string, BindValue>);
    if (podcasts) {
      for (const episode of episodes) {
        episode.parent = getPodcast({id: episode.parent_id})[0];
      }
    }
    if (bookmarks) {
      for (const episode of episodes) {
        episode.bookmarks = getBookmark({parent_id: episode.id});
      }
    }
    if (metadata) {
      for (const episode of episodes) {
        episode.metadata = getMetadata({parent_id: episode.id}) ?? [];
      }
    }
    return episodes;
  } catch (err) {
    log.error(err);
    return [];
  }
};

export const addEpisode = ({
  id,
  modified_at,
  parent_id,
  url,
  title,
  duration,
  type,
  length
}: AddEpisode): boolean => {
  if (!uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  if (!uuid.validate(parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${parent_id})`);
    return false;
  }
  try {
    const episodes = getEpisode({url});
    if (episodes.length > 0) return false;
    const query = db.prepare(
      'INSERT INTO episodes (id, modified_at, parent_id, url, title, duration, type, length) \
      VALUES (:id, :modified_at, :parent_id, :url, :title, :duration, :type, :length)'
    );
    const changes = query.run({
      id,
      modified_at,
      parent_id,
      url,
      title,
      duration,
      type,
      length
    });
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Episode>('episode:add', {detail: getEpisode({id})[0]})
      );
    }
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const removeEpisode = (id: string): boolean => {
  if (!uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  try {
    if (!id) return false;
    const episodes = getEpisode({id});
    if (!episodes.length) return false;
    const query = db.prepare('DELETE FROM episodes WHERE id=:id');
    const changes = query.run({id});
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Episode>('episode:remove', {detail: episodes[0]})
      );
    }
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const updateEpisode = (params: UpdateEpisode): boolean => {
  if (!uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return false;
  }
  try {
    log.getLogger('debug').debug(`${emoji} Update episode (${params.id})`);
    const episodes = getEpisode({id: params.id});
    if (!episodes.length) return false;
    const episode = {
      ...episodes[0],
      ...params
    };
    const query = db.prepare(
      'UPDATE episodes\
      SET modified_at=:modified_at, url=:url, title=:title, duration=:duration, type=:type, length=:length\
      WHERE id=:id'
    );
    const changes = query.run({
      id: episode.id,
      modified_at: episode.modified_at,
      url: episode.url,
      title: episode.title,
      duration: episode.duration,
      type: episode.type,
      length: episode.length
    });
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

addEventListener('episode:add', ((event: CustomEvent<Episode>) => {
  const episode = event.detail;
  log.info(`${emoji} Add episode (${episode.url})`);
}) as EventListener);

addEventListener('episode:remove', ((event: CustomEvent<Episode>) => {
  const episode = event.detail;
  log.warning(`${emoji} Remove episode (${episode.url})`);
}) as EventListener);

addEventListener('podcast:remove', ((event: CustomEvent<Podcast>) => {
  const podcast = event.detail;
  const episodes = getEpisode({parent_id: podcast.id});
  episodes.forEach((episode) => removeEpisode(episode.id));
}) as EventListener);
