import * as log from 'log';
import * as env from './env.ts';
import * as handle from './handle.ts';

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
        headers: handle.getHeaders(request)
      });
      try {
        const url = new URL(request.url);
        if (handle.artistPattern.test(url)) {
          respondWith(handle.artist(url, request)).catch(maybe);
          continue;
        }
        if (handle.albumPattern.test(url)) {
          respondWith(handle.album(url, request)).catch(maybe);
          continue;
        }
        if (handle.songPattern.test(url)) {
          respondWith(handle.song(url, request)).catch(maybe);
          continue;
        }
        if (handle.podcastPattern.test(url)) {
          respondWith(handle.podcast(url, request)).catch(maybe);
          continue;
        }
        if (handle.episodePattern.test(url)) {
          respondWith(handle.episode(url, request)).catch(maybe);
          continue;
        }
        if (handle.bookmarkPattern.test(url)) {
          const response = handle.bookmark(url, request).catch((err) => {
            maybe(err);
            return error;
          });
          respondWith(response).catch(maybe);
          continue;
        }
        if (handle.artworkPattern.test(url)) {
          const response = handle.artwork(url, request).catch((err) => {
            maybe(err);
            return error;
          });
          respondWith(response).catch(maybe);
          continue;
        }
        if (handle.audioPattern.test(url)) {
          const response = handle.audio(url, request).catch((err) => {
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
        const response = handle.sveltekit(url, request).catch((err) => {
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
          headers: handle.getHeaders(request)
        })
      ).catch(maybe);
    }
  };
  for await (const conn of server) {
    onConn(conn).catch(maybe);
  }
};
