import * as log from 'log';
import * as uuid from 'uuid';
import {db, getEpisode, getMetadata} from './mod.ts';
import {Podcast, AddPodcast, GetPodcast, UpdatePodcast} from '../types.ts';

const emoji = '🎙️ ';

export const getPodcast = (params: GetPodcast = {}): Podcast[] => {
  if (params.id && !uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return [];
  }
  try {
    let sql =
      'SELECT podcasts.*,\
    (SELECT COUNT(*) FROM episodes WHERE parent_id=podcasts.id) AS episode_count\
    FROM podcasts';
    if (params.id) {
      sql += ' WHERE podcasts.id=:id LIMIT 1';
    } else if (params.url) {
      sql += ' WHERE podcasts.url=:url LIMIT 1';
    } else {
      sql += ' ORDER BY datetime(podcasts.modified_at) DESC';
    }
    const {episodes, bookmarks, metadata} = params;
    delete params.episodes;
    delete params.bookmarks;
    delete params.metadata;
    const query = db.prepare(sql);
    const podcasts = query.all<Podcast>(params);
    if (episodes) {
      for (const podcast of podcasts) {
        podcast.episodes =
          getEpisode({parent_id: podcast.id, bookmarks, metadata}) ?? [];
      }
    }
    if (metadata) {
      for (const podcast of podcasts) {
        podcast.metadata = getMetadata({parent_id: podcast.id}) ?? [];
      }
    }
    return podcasts;
  } catch (err) {
    log.error(err);
    return [];
  }
};

export const addPodcast = ({
  id,
  modified_at,
  url,
  title
}: AddPodcast): boolean => {
  if (!uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  try {
    const podcasts = getPodcast({url});
    if (podcasts.length > 0) return false;
    log.info(`${emoji} Add podcast (${url})`);
    const query = db.prepare(
      'INSERT INTO podcasts (id, modified_at, url, title) \
      VALUES (:id, :modified_at, :url, :title)'
    );
    const changes = query.run({
      id,
      modified_at,
      url,
      title
    });
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Podcast>('podcast:add', {detail: getPodcast({id})[0]})
      );
    }
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const removePodcast = (id: string): boolean => {
  if (!uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  try {
    const podcasts = getPodcast({id});
    if (!podcasts.length) return false;
    log.warning(`${emoji} Remove podcast (${podcasts[0].url})`);
    const query = db.prepare('DELETE FROM podcasts WHERE id=:id');
    const changes = query.run({id});
    if (changes > 0) {
      dispatchEvent(
        new CustomEvent<Podcast>('podcast:remove', {detail: podcasts[0]})
      );
    }
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const updatePodcast = (params: UpdatePodcast): boolean => {
  if (!uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return false;
  }
  try {
    log.getLogger('debug').debug(`${emoji} Update podcast (${params.id})`);
    const podcasts = getPodcast({id: params.id});
    if (!podcasts.length) return false;
    const podcast = {
      ...podcasts[0],
      ...params
    };
    const query = db.prepare(
      'UPDATE podcasts\
      SET modified_at=:modified_at, url=:url, title=:title\
      WHERE id=:id'
    );
    const changes = query.run({
      id: podcast.id,
      modified_at: podcast.modified_at,
      url: podcast.url,
      title: podcast.title
    });
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};
