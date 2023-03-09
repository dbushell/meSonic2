import * as log from 'log';
import * as timer from '../library/timer.ts';
import * as cache from '../cache/mod.ts';
import {addPodcast, getPodcast, updatePodcast} from './podcast.ts';
import {
  addEpisode,
  getEpisode,
  removeEpisode,
  updateEpisode
} from './episode.ts';
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
    const text = new TextDecoder().decode(await response.arrayBuffer());
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
    const podcast = getPodcast({id: props.id});
    if (podcast.length) {
      updatePodcast(props);
    } else {
      addPodcast(props);
    }
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
    const text = new TextDecoder().decode(await response.arrayBuffer());
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
    const text = new TextDecoder().decode(await response.arrayBuffer());
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

export const syncPodcast = async (podcast: Podcast): Promise<unknown> => {
  try {
    const tasks: Promise<unknown>[] = [];
    const meta = await getEpisodesMeta(podcast);
    if (!meta) {
      throw new Error('no podcast meta');
    }
    tasks.push(fetchArtwork(podcast));
    const episodeIds = new Set<string>();
    const oldEpisodes = getEpisode({parent_id: podcast.id});
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
          Object.entries(props).find(([key, value]) => episode[key] !== value)
        ) {
          updateEpisode({
            id: episode.id,
            ...props
          });
        }
      } else {
        addEpisode({
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
        removeEpisode(e.id);
      });
    // Fetch new episode audio (latest only?)
    const newEpisodes = getEpisode({parent_id: podcast.id});
    updatePodcast({
      id: podcast.id,
      modified_at: newEpisodes[0].modified_at
    });
    tasks.push(prefetchAudio(newEpisodes[0]));
    return Promise.all(tasks);
  } catch (err) {
    log.error(err);
  }
};

export const prefetchAudio = async (episode: Episode): Promise<void> => {
  try {
    await cache.fetchCache(new URL(episode.url), {
      maxAge: timer.DAY * 30,
      name: `audio:${episode.id}`,
      accept: [episode.type],
      compress: false,
      prefetch: true
    });
  } catch (err) {
    log.error(err);
  }
};

export const fetchAudio = async (episode: Episode): Promise<Response> => {
  try {
    const audio = await cache.fetchCache(new URL(episode.url), {
      maxAge: timer.DAY * 30,
      name: `audio:${episode.id}`,
      accept: [episode.type],
      compress: false
    });
    return audio;
  } catch (err) {
    log.error(err);
    return new Response(null, {status: 404, statusText: 'Not Found'});
  }
};

export const fetchArtwork = async (podcast: Podcast): Promise<Response> => {
  try {
    const meta = await getPodcastMeta(podcast);
    if (!meta) {
      throw new Error('no podcast meta');
    }
    if (!meta.feed.artwork) {
      throw new Error('no artwork');
    }
    const artwork = await cache.fetchCache(new URL(meta.feed.artwork), {
      maxAge: timer.WEEK,
      name: `artwork:${podcast.id}`,
      accept: [
        'image/avif',
        'image/webp;q=0.9',
        'image/png;q=0.8',
        'image/jpeg;q=0.7',
        'image/jpg;q=0.7'
      ]
    });
    return artwork;
  } catch (err) {
    log.error(err);
    return new Response(null, {status: 404, statusText: 'Not Found'});
  }
};
