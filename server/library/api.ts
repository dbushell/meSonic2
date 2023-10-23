import * as log from 'log';
import * as html from 'html';
import * as xml from 'xml_streamify';
import * as timer from '../library/timer.ts';
import * as cache from '../cache/mod.ts';
import * as db from '../database/mod.ts';
import {Queue} from 'queue';
import type {Podcast, Episode, AddPodcast, AddEpisode} from '../types.ts';

const queue = new Queue<Podcast, boolean>({
  concurrency: 3
});

export const addPodcastByFeed = async (
  url: string
): Promise<Podcast | undefined> => {
  try {
    const props: AddPodcast = {
      id: crypto.randomUUID(),
      url: url,
      title: '',
      modified_at: ''
    };
    const controller = new AbortController();
    const parser = xml.parse(url, {
      signal: controller.signal
    });
    for await (const node of parser) {
      if (node.is('channel', 'title')) {
        props.title = html.unescape(node.innerText.trim());
      }
      if (node.is('channel', 'lastBuildDate')) {
        props.modified_at = new Date(node.innerText).toISOString();
      }
      if (node.is('channel', 'pubDate')) {
        props.modified_at = new Date(node.innerText).toISOString();
      }
      if (props.title && props.modified_at) {
        controller.abort();
        break;
      }
    }
    if (!props.title) {
      throw new Error(`Feed missing title ("${url}")`);
    }
    if (!props.modified_at) {
      props.modified_at = new Date().toISOString();
    }
    let podcast = db.getPodcast({url: props.url});
    if (podcast.length) {
      props.id = podcast[0].id;
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

export const syncPodcast = (podcast: Podcast) =>
  queue.append(podcast, syncCallback);

const syncCallback = async (podcast: Podcast): Promise<boolean> => {
  try {
    let title = podcast.title;
    const episodes: AddEpisode[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort('timeout');
    }, 10_000);
    const parser = xml.parse(podcast.url, {
      signal: controller.signal
    });

    for await (const node of parser) {
      // Check for title change
      if (node.is('channel', 'title')) {
        title = html.unescape(node.innerText.trim());
      }
      if (node.is('channel', 'item')) {
        const enclosure = node.first('enclosure');
        if (!enclosure) continue;
        let duration = 0;
        const durationText = node.first('itunes:duration')?.innerText;
        if (durationText) {
          for (const [i, n] of durationText.split(':').reverse().entries()) {
            duration += Number.parseInt(n) * Math.pow(60, i);
          }
        }
        // Remove query string from url
        const url = new URL(enclosure.attributes.url);
        url.search = '';
        const props: AddEpisode = {
          duration,
          parent_id: podcast.id,
          id: crypto.randomUUID(),
          url: url.href,
          title: html.unescape(node.first('title')?.innerText?.trim() ?? ''),
          length: Number.parseInt(enclosure.attributes.length ?? '0'),
          type: enclosure.attributes.type ?? '',
          modified_at: new Date(
            node.first('pubDate')?.innerText.trim() || Date.now()
          ).toISOString()
        };
        episodes.push(props);
        if (episodes.length >= 100) {
          controller.abort();
          break;
        }
      }
    }

    clearTimeout(timeout);
    if (controller.signal.reason === 'timeout') {
      throw new Error(`sync timeout ("${title}")`);
    }

    if (!episodes.length) {
      throw new Error(`sync no episodes ("${title}")`);
    }

    const episodeIds = new Set<string>();
    const oldEpisodes = db.getEpisode({parent_id: podcast.id});

    episodes.forEach((props) => {
      const episode = oldEpisodes.find(
        (e) => e.title === props.title && e.url === props.url
      );
      if (episode) {
        props.id = episode.id;
        episodeIds.add(episode.id);
        // Only update if a property has changed
        if (
          Object.entries(props).find(
            ([key, value]) => episode[key as keyof Episode] !== value
          )
        ) {
          db.updateEpisode({
            ...props
          });
        }
      } else {
        db.addEpisode({
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
    if (!newEpisodes.length) {
      return false;
    }
    db.updatePodcast({
      title,
      id: podcast.id,
      modified_at: newEpisodes[0].modified_at
    });
    await Promise.all([
      fetchArtwork(podcast).catch((err) => {
        log.debug(err);
      }),
      fetchAudio(newEpisodes[0]).catch((err) => {
        log.debug(err);
      })
    ]);
  } catch (err) {
    log.error(err);
    return false;
  }
  return true;
};

export const fetchAudio = (
  episode: Episode,
  prefetch = true
): Promise<Response> => {
  return cache.fetchCache(new URL(episode.url), {
    maxAge: timer.DAY * 30,
    name: `audio:${episode.id}`,
    accept: [episode.type],
    compress: false,
    prefetch
  });
};

export const fetchArtwork = async (
  podcast: Podcast,
  prefetch = true
): Promise<Response> => {
  const controller = new AbortController();
  const parser = xml.parse(podcast.url, {
    signal: controller.signal
  });
  let image = '';
  // Search feed for artwork
  for await (const node of parser) {
    if (!image && node.is('channel', 'image', 'url')) {
      image = node.innerText.trim();
    }
    // Prefer itunes image
    if (
      node.is('channel', 'itunes:image') &&
      Object.hasOwn(node.attributes, 'href')
    ) {
      image = node.attributes.href;
      controller.abort();
      break;
    }
    // Do not search past first item
    if (node.is('item')) {
      controller.abort();
      break;
    }
  }
  return cache.fetchCache(new URL(image), {
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
};
