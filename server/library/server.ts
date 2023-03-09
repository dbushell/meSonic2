import * as log from 'log';
import * as path from 'path';
import * as env from './env.ts';
import * as db from '../database/mod.ts';
import {serveFile, serveDir} from 'file_server';
import {AddBookmark, Bookmark, RemoveBookmark} from '../types.ts';


const kit = [
  path.join(env.get('BUILD_DIR'), 'server/index.js'),
  path.join(env.get('BUILD_DIR'), 'server/manifest.js'),
];

const {Server} = await import(kit[0]);
const {manifest} = await import(kit[1]);

const sveltekit = new Server(manifest) as {
  init(options: {env: Record<string, string>}): Promise<void>;
  respond(
    request: Request,
    options: {
      getClientAddress(): string;
    }
  ): Promise<Response>;
};

await sveltekit.init({
  env: {
    API_SECRET: env.get('API_SECRET'),
    PUBLIC_API_URL: env.get('APP_ORIGIN'),
    PUBLIC_APP_URL: env.get('APP_ORIGIN')
  }
});

const emoji = '🚀';

let port: number;
let hostname: string;
let controller: AbortController;

export interface ServeOptions {
  port?: number;
  hostname?: string;
}

export const close = () => {
  log.warning(`${emoji} Close server`);
  if (controller) {
    controller.abort();
  }
};

const bookmarkPattern = new URLPattern({pathname: '/api/bookmark/:id'});
const podcastPattern = new URLPattern({pathname: '/api/podcast/:id'});
const episodePattern = new URLPattern({pathname: '/api/episode/:id'});
const artworkPattern = new URLPattern({pathname: '/artwork/:id'});
const audioPattern = new URLPattern({pathname: '/audio/:id'});

const getHeaders = (request: Request): Headers => {
  // const ip = request.headers.get('x-forwarded-for') ?? '';
  const headers = new Headers();
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  // 'origin, accept, accept-encoding, content-type, content-length, range'
  headers.set('access-control-allow-headers', '*');
  headers.set('access-control-allow-methods', 'POST, GET, HEAD, OPTIONS');
  headers.set('access-control-allow-origin', env.get('ORIGIN'));
  const authorization = request.headers.get('authorization') ?? '';
  if (authorization === `Bearer ${env.get('API_SECRET')}`) {
    headers.set('access-control-allow-origin', '*');
  }
  return headers;
};

export const serve = async (options: ServeOptions) => {
  if (controller) {
    controller.abort();
  }
  port = options.port ?? 3000;
  hostname = options.hostname ?? 'localhost';
  controller = new AbortController();

  log.info(`${emoji} Listening: http://${hostname}:${port}`);

  const server = Deno.listen({port, hostname});

  const maybe = (err: Error) => {
    if (err && env.dev()) {
      log.error(err);
    }
  };

  const onConn = async (conn: Deno.Conn) => {
    const httpConn = Deno.serveHttp(conn);
    for await (const {request, respondWith} of httpConn) {
      const error = new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
        headers: getHeaders(request)
      });
      try {
        const url = new URL(request.url);
        if (podcastPattern.test(url)) {
          respondWith(handlePodcast(url, request)).catch(maybe);
          continue;
        }
        if (episodePattern.test(url)) {
          respondWith(handleEpisode(url, request)).catch(maybe);
          continue;
        }
        if (bookmarkPattern.test(url)) {
          const response = handleBookmark(url, request).catch((err) => {
            maybe(err);
            return error;
          });
          respondWith(response).catch(maybe);
          continue;
        }
        if (artworkPattern.test(url)) {
          const response = handleArtwork(url, request).catch((err) => {
            maybe(err);
            return error;
          });
          respondWith(response).catch(maybe);
          continue;
        }
        if (audioPattern.test(url)) {
          const response = handleAudio(url, request).catch((err) => {
            maybe(err);
            return error;
          });
          respondWith(response).catch(maybe);
          continue;
        }
        if (env.dev()) {
          const vite = new URL(
            `http://${env.get('HOSTNAME')}:${env.get('DEV_PORT')}`
          );
          const response = await fetch(new URL(url.pathname, vite));
          respondWith(response).catch(maybe);
          continue;
        }
        const response = handleSvelteKit(url, request).catch((err) => {
          maybe(err);
          return error;
        });
        respondWith(response).catch(maybe);
        continue;
      } catch (error) {
        maybe(error);
      }
      respondWith(
        new Response(null, {
          status: 404,
          statusText: 'Not Found',
          headers: getHeaders(request)
        })
      ).catch(maybe);
    }
  };
  for await (const conn of server) {
    onConn(conn).catch(maybe);
  }
};

const handleSvelteKit = async (
  url: URL,
  request: Request
): Promise<Response> => {
  let response: Response = await serveDir(request, {
    fsRoot: path.join(env.get('BUILD_DIR'), 'client'),
    quiet: true
  });
  if (response && (response.ok || response.status < 400)) {
    getHeaders(request).forEach((value, key) => {
      response.headers.set(key, value);
    });
    const ext = path.extname(url.pathname);
    if (['.js', '.css', '.svg', '.png', '.woff2'].includes(ext)) {
      response.headers.set(
        'cache-control',
        'public, max-age=86400, must-revalidate'
      );
    }
    if (url.pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
      response.headers.set(
        'cache-control',
        'public, max-age=31536000, immutable'
      );
    }
    return response;
  }
  response = await sveltekit.respond(request, {
    // https://github.com/oakserver/oak/blob/main/request.ts#L39
    getClientAddress() {
      return request.headers.get('x-forwarded-for') ?? '';
    }
  });
  if (response) {
    getHeaders(request).forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }
  throw new Error('We should not be here...');
};

const handleBookmark = async (
  url: URL,
  request: Request
): Promise<Response> => {
  const id = bookmarkPattern.exec(url)?.pathname.groups.id;
  const episodes = url.searchParams.get('episodes') === 'true';
  const podcasts = url.searchParams.get('podcasts') === 'true';

  if (request.method === 'POST') {
    if (id === 'add') {
      const body = (await request.json()) as AddBookmark;
      const episode = db.getEpisode({id: body.parent_id});
      if (episode.length) {
        db.addBookmark(body);
        db.addMetadata({
          parent_id: episode[0].id,
          parent_type: 'episode',
          key: 'played',
          value: new Date().toISOString()
        });
        return new Response(null, {headers: getHeaders(request)});
      }
    }
    if (id === 'remove') {
      const body = (await request.json()) as RemoveBookmark;
      if (body.id) {
        db.removeBookmark({id: body.id});
      } else if (body.parent_id) {
        db.removeBookmark({parent_id: body.parent_id});
      }
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
    bookmark = db.getBookmark({episodes, podcasts});
  } else {
    bookmark = db.getBookmark({id, episodes, podcasts});
  }
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(bookmark), {
    headers: new Headers(headers)
  });
};

const handlePodcast = async (url: URL, request: Request): Promise<Response> => {
  const id = podcastPattern.exec(url)?.pathname.groups.id;
  const episodes = url.searchParams.get('episodes') === 'true';
  const bookmarks = url.searchParams.get('bookmarks') === 'true';
  const metadata = url.searchParams.get('metadata') === 'true';
  const headers = getHeaders(request);
  headers.set('content-type', 'application/json');
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
  return new Response(null, {
    status: 404,
    statusText: 'Not Found',
    headers: getHeaders(request)
  });
};

const handleEpisode = async (url: URL, request: Request): Promise<Response> => {
  const id = episodePattern.exec(url)?.pathname.groups.id;
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
  return new Response(null, {
    status: 404,
    statusText: 'Not Found',
    headers: getHeaders(request)
  });
};

const handleArtwork = async (url: URL, request: Request): Promise<Response> => {
  try {
    const id = artworkPattern.exec(url)?.pathname.groups.id;
    const podcast = db.getPodcast({id});
    if (!podcast.length) throw new Error();
    const response = await db.fetchArtwork(podcast[0]);
    if (response.headers.has('x-cache-location')) {
      return handleCache(response, request);
    }
    getHeaders(request).forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  } catch {
    return new Response(null, {
      status: 404,
      statusText: 'Not Found',
      headers: getHeaders(request)
    });
  }
};

const handleAudio = async (url: URL, request: Request): Promise<Response> => {
  try {
    const id = audioPattern.exec(url)?.pathname.groups.id;
    const episode = db.getEpisode({id});
    if (!episode.length) throw new Error();
    const response = await db.fetchAudio(episode[0]);
    if (response.headers.has('x-cache-location')) {
      return handleCache(response, request);
    }
    getHeaders(request).forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  } catch {
    return new Response(null, {
      status: 404,
      statusText: 'Not Found',
      headers: getHeaders(request)
    });
  }
};

const handleCache = async (
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
