import * as env from './env.ts';
import {serveFile} from 'file_server';
import * as db from '../database/mod.ts';
import * as api from './api.ts';
import type {
  RemovePodcast,
  AddBookmark,
  Bookmark,
  RemoveBookmark,
  UnplayedBookmark
} from '../types.ts';
import type {Handle} from 'velocirouter';

type Handler = Handle<Deno.ServeHandlerInfo>;

export {sveltekit} from './sveltekit.ts';

export const getHeaders = (request?: Request): Headers => {
  // TODO: const ip = request.headers.get('x-forwarded-for') ?? '';
  // TODO: 'origin, accept, accept-encoding, content-type, content-length, range'
  const headers = new Headers();
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  headers.set('access-control-allow-headers', '*');
  headers.set('access-control-allow-methods', 'POST, GET, HEAD, OPTIONS');
  headers.set('access-control-allow-origin', env.get('ORIGIN'));
  const authorization = request?.headers.get('authorization') ?? '';
  if (env.get('DEV') && authorization === `Bearer ${env.get('API_SECRET')}`) {
    headers.set('access-control-allow-origin', '*');
  }
  return headers;
};

export const error404 = (request: Request) =>
  new Response(null, {
    status: 404,
    statusText: 'Not Found',
    headers: getHeaders(request)
  });

export const bookmark: Handler = async (request, _r, {match}) => {
  const url = new URL(request.url);
  const {id} = match.pathname.groups;
  const songs = url.searchParams.get('songs') === 'true';
  const albums = url.searchParams.get('albums') === 'true';
  const artists = url.searchParams.get('artists') === 'true';
  const episodes = url.searchParams.get('episodes') === 'true';
  const podcasts = url.searchParams.get('podcasts') === 'true';
  if (request.method === 'POST') {
    if (id === 'add') {
      const body = (await request.json()) as AddBookmark;
      if (body.parent_type === 'song') {
        const song = db.getSong({id: body.parent_id});
        if (song.length) {
          db.addBookmark(body);
        }
      }
      if (body.parent_type === 'episode') {
        const episode = db.getEpisode({id: body.parent_id});
        if (episode.length) {
          db.addBookmark(body);
          db.addMetadata({
            parent_id: body.parent_id,
            parent_type: 'episode',
            key: 'played',
            value: new Date().toISOString()
          });
        }
      }
      return new Response(null, {headers: getHeaders(request)});
    }
    if (id === 'remove') {
      const body = (await request.json()) as RemoveBookmark;
      db.removeBookmark(body);
      return new Response(null, {headers: getHeaders(request)});
    }
    if (id === 'unplayed') {
      const body = (await request.json()) as UnplayedBookmark;
      db.removeBookmark(body);
      const meta = db.getMetadata({
        parent_id: body.parent_id,
        key: 'played'
      });
      meta.forEach(db.removeMetadata);
      return new Response(null, {headers: getHeaders(request)});
    }
    return new Response(null, {
      status: 400,
      statusText: 'Bad Request',
      headers: getHeaders(request)
    });
  }
  let bookmark: Bookmark[];
  if (id === 'all') {
    bookmark = db.getBookmark({songs, albums, artists, episodes, podcasts});
  } else {
    bookmark = db.getBookmark({id, songs, albums, artists, episodes, podcasts});
  }
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(bookmark), {
    headers: new Headers(headers)
  });
};

export const podcast: Handler = async (request, _r, {match}) => {
  const url = new URL(request.url);
  const {id} = match.pathname.groups;
  const episodes = url.searchParams.get('episodes') === 'true';
  const bookmarks = url.searchParams.get('bookmarks') === 'true';
  const metadata = url.searchParams.get('metadata') === 'true';
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
  if (request.method === 'POST') {
    if (id === 'add') {
      const body = (await request.json()) as {feed: string};
      const podcast = await api.addPodcastByFeed(body.feed);
      if (podcast) {
        api.syncPodcast(podcast);
        return new Response(JSON.stringify(podcast), {
          headers: getHeaders(request)
        });
      }
    }
    if (id === 'remove') {
      const body = (await request.json()) as RemovePodcast;
      db.removePodcast(body);
      return new Response(null, {headers: getHeaders(request)});
    }
    return error404(request);
  }
  if (id === 'all') {
    return new Response(
      JSON.stringify(db.getPodcast({episodes, bookmarks, metadata})),
      {
        headers: new Headers(headers)
      }
    );
  }
  const podcast = db.getPodcast({id, episodes, bookmarks, metadata});
  if (podcast.length) {
    if (podcast.length === 1 && podcast[0].episodes) {
      await db.getEpisodeTransient(podcast[0].episodes);
    }
    return new Response(JSON.stringify(podcast), {
      headers: new Headers(headers)
    });
  }
  return error404(request);
};

export const episode: Handler = async (request, _r, {match}) => {
  const url = new URL(request.url);
  const {id} = match.pathname.groups;
  const podcasts = url.searchParams.get('podcasts') === 'true';
  const bookmarks = url.searchParams.get('bookmarks') === 'true';
  const metadata = url.searchParams.get('metadata') === 'true';
  const episode = db.getEpisode({id, podcasts, bookmarks, metadata});
  if (metadata) await db.getEpisodeTransient(episode);
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
  if (episode.length) {
    return new Response(JSON.stringify(episode), {
      headers: new Headers(headers)
    });
  }
  return error404(request);
};

export const artwork: Handler = async (request, _r, {match}) => {
  const {id} = match.pathname.groups;
  try {
    if (!id) throw new Error();
    const podcast = db.getPodcast({id});
    if (!podcast.length) throw new Error();
    const response = await api.fetchArtwork(podcast[0]);
    if (response.headers.has('x-cache-location')) {
      return handleCache(response, request);
    }
    throw new Error();
  } catch {
    return error404(request);
  }
};

export const audio: Handler = async (request, _r, {match}) => {
  const url = new URL(request.url);
  const {id} = match.pathname.groups;
  try {
    if (!id) throw new Error();
    const type = url.searchParams.get('type');
    if (type === 'episode') {
      const episode = db.getEpisode({id});
      if (!episode.length) throw new Error();
      const response = await api.fetchAudio(episode[0]);
      if (response.headers.has('x-cache-location')) {
        return handleCache(response, request);
      }
    }
    if (type === 'song') {
      const song = db.getSong({id});
      if (!song.length) throw new Error();
      const response = await serveFile(request, song[0].path);
      response.headers.set('content-type', song[0].mimetype);
      getHeaders(request).forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }
    throw new Error();
  } catch {
    return error404(request);
  }
};

export const handleCache = async (
  cached: Response,
  request: Request
): Promise<Response> => {
  const location = cached.headers.get('x-cache-location')!;
  const response = await serveFile(request, location);
  getHeaders(request).forEach((value, key) => {
    response.headers.set(key, value);
  });
  cached.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  response.headers.set(
    'cache-control',
    'public, max-age=86400, must-revalidate'
  );
  response.headers.set('x-cache-location', location.split('/').at(-1)!);
  return response;
};

export const artist: Handler = (request, _r, {match}) => {
  const url = new URL(request.url);
  const {id} = match.pathname.groups;
  const albums = url.searchParams.get('albums') === 'true';
  const songs = url.searchParams.get('songs') === 'true';
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
  if (id === 'all') {
    return new Response(JSON.stringify(db.getArtist()), {
      headers
    });
  }
  const artist = db.getArtist({id, albums, songs});
  if (artist.length) {
    const headers = getHeaders(request);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(artist), {
      headers
    });
  }
  return error404(request);
};

export const album: Handler = (request, _r, {match}) => {
  const url = new URL(request.url);
  const {id} = match.pathname.groups;
  const bookmarks = url.searchParams.get('bookmarks') === 'true';
  const artists = url.searchParams.get('artists') === 'true';
  const songs = url.searchParams.get('songs') === 'true';
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
  if (id === 'all') {
    return new Response(JSON.stringify(db.getAlbum()), {
      headers
    });
  }
  const album = db.getAlbum({id, artists, songs, bookmarks});
  if (album.length) {
    const headers = getHeaders(request);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(album), {
      headers
    });
  }
  return error404(request);
};

export const song: Handler = (request, _r, {match}) => {
  const url = new URL(request.url);
  const {id} = match.pathname.groups;
  const bookmarks = url.searchParams.get('bookmarks') === 'true';
  const artists = url.searchParams.get('artists') === 'true';
  const albums = url.searchParams.get('albums') === 'true';
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
  if (id === 'all') {
    return new Response(JSON.stringify(db.getSong()), {
      headers
    });
  }
  const song = db.getSong({id, artists, albums, bookmarks});
  if (song.length) {
    const headers = getHeaders(request);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(song), {
      headers
    });
  }
  return error404(request);
};
