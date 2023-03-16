import * as log from 'log';
import * as timer from '../library/timer.ts';
import * as cache from '../cache/mod.ts';
import * as db from '../database/mod.ts';
import {Podcast, Episode} from '../types.ts';

export const addPodcastByFeed = async (
  url: string
): Promise<Podcast | undefined> => {
  try {
    // https://podcastindex-org.github.io/docs-api/#get-/podcasts/byfeedurl
    const apiUrl = new URL(
      'https://api.podcastindex.org/api/1.0/podcasts/byfeedurl'
    );
    apiUrl.searchParams.set('url', url);
    const response = await cache.fetchCache(new URL(apiUrl));
    const text = await response.text();
    const json = JSON.parse(text);
    if (json.status !== 'true') {
      throw new Error(json.description ?? 'no description');
    }
    const props = {
      id: json.feed.podcastGuid,
      url: json.feed.url,
      title: json.feed.title,
      modified_at: new Date(json.feed.lastUpdateTime * 1000).toISOString()
    };
    let podcast = db.getPodcast({id: props.id});
    if (podcast.length) {
      db.updatePodcast(props);
    } else {
      db.addPodcast(props);
    }
    podcast = db.getPodcast({id: props.id});
    return podcast[0];
  } catch (err) {
    log.error(err);
    return;
  }
};

// TODO: podcast index types
// deno-lint-ignore no-explicit-any
export const getPodcastMeta = async (podcast: Podcast): Promise<any> => {
  try {
    // https://podcastindex-org.github.io/docs-api/#get-/podcasts/byfeedurl
    const apiUrl = new URL(
      'https://api.podcastindex.org/api/1.0/podcasts/byguid'
    );
    apiUrl.searchParams.set('guid', podcast.id);
    const response = await cache.fetchCache(new URL(apiUrl), {
      maxAge: timer.DAY
    });
    const text = await response.text();
    const json = JSON.parse(text);
    if (json.status !== 'true') {
      throw new Error(json.description ?? 'no description');
    }
    return json;
  } catch (err) {
    log.error(err);
    return;
  }
};

// TODO: podcast index types
// deno-lint-ignore no-explicit-any
export const getEpisodesMeta = async (podcast: Podcast): Promise<any> => {
  try {
    // https://podcastindex-org.github.io/docs-api/#get-/episodes/bypodcastguid
    const apiUrl = new URL(
      'https://api.podcastindex.org/api/1.0/episodes/bypodcastguid'
    );
    apiUrl.searchParams.set('guid', podcast.id);
    apiUrl.searchParams.set('max', '100');
    const response = await cache.fetchCache(new URL(apiUrl), {
      maxAge: timer.HOUR
    });
    const text = await response.text();
    const json = JSON.parse(text);
    if (json.status !== 'true' || !Array.isArray(json.items)) {
      // TODO: re-add feed if guid does not match?
      throw new Error(JSON.stringify(json));
    }
    return json;
  } catch (err) {
    log.error(podcast);
    log.error(err);
    return;
  }
};

export const syncPodcast = async (podcast: Podcast): Promise<unknown> => {
  try {
    const tasks: Promise<unknown>[] = [];
    const meta = await getEpisodesMeta(podcast);
    if (!meta) {
      throw new Error('no episode meta');
    }
    tasks.push(fetchArtwork(podcast));
    const episodeIds = new Set<string>();
    const oldEpisodes = db.getEpisode({parent_id: podcast.id});

    // deno-lint-ignore no-explicit-any
    meta.items.forEach((item: any) => {
      const props = {
        url: item.enclosureUrl,
        title: item.title,
        duration: item.duration,
        type: item.enclosureType,
        length: item.enclosureLength,
        modified_at: new Date(item.datePublished * 1000).toISOString()
      };
      const episode = oldEpisodes.find(
        (e) => e.title === props.title && e.url === props.url
      );
      if (episode) {
        episodeIds.add(episode.id);
        // Only update if a property has changed
        if (
          Object.entries(props).find(
            ([key, value]) => episode[key as keyof Episode] !== value
          )
        ) {
          db.updateEpisode({
            id: episode.id,
            ...props
          });
        }
      } else {
        db.addEpisode({
          id: crypto.randomUUID(),
          parent_id: podcast.id,
          ...props
        });
      }
    });
    // Remove outdated or unknown episodes
    oldEpisodes
      .filter((e) => !episodeIds.has(e.id))
      .forEach((e) => {
        db.removeEpisode(e.id);
      });
    // Fetch new episode audio (latest only?)
    const newEpisodes = db.getEpisode({parent_id: podcast.id});
    db.updatePodcast({
      id: podcast.id,
      modified_at: newEpisodes[0].modified_at
    });
    tasks.push(fetchAudio(newEpisodes[0]));
    return Promise.all(tasks);
  } catch (err) {
    log.error(`sync podcast: ${err}`);
  }
};

export const fetchAudio = async (
  episode: Episode,
  prefetch = true
): Promise<Response> => {
  try {
    const response = await cache.fetchCache(new URL(episode.url), {
      maxAge: timer.DAY * 30,
      name: `audio:${episode.id}`,
      accept: [episode.type],
      compress: false,
      prefetch
    });
    return response;
  } catch (err) {
    log.error(err);
    return new Response(null, {status: 404, statusText: 'Not Found'});
  }
};

export const fetchArtwork = async (
  podcast: Podcast,
  prefetch = true
): Promise<Response> => {
  try {
    const meta = await getPodcastMeta(podcast);
    if (!meta) {
      throw new Error('no podcast meta');
    }
    if (!meta.feed.artwork) {
      throw new Error('no artwork');
    }
    const response = await cache.fetchCache(new URL(meta.feed.artwork), {
      maxAge: timer.DAY,
      name: `artwork:${podcast.id}`,
      prefetch,
      accept: [
        'image/avif',
        'image/webp;q=0.9',
        'image/png;q=0.8',
        'image/jpeg;q=0.7',
        'image/jpg;q=0.7'
      ]
    });
    return response;
  } catch (err) {
    log.error(`fetch artwork: ${err}`);
    return new Response(null, {status: 404, statusText: 'Not Found'});
  }
};
