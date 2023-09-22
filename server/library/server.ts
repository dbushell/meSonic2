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

export const serve = (options: ServeOptions) => {
  if (controller) {
    controller.abort();
  }
  port = options.port ?? 3000;
  hostname = options.hostname ?? 'localhost';
  controller = new AbortController();

  log.info(`${emoji} Listening: http://${hostname}:${port}`);

  const handler = (
    request: Request,
    info: Deno.ServeHandlerInfo
  ): Response | Promise<Response> => {
    const url = new URL(request.url);
    if (handle.artistPattern.test(url)) {
      return handle.artist(url, request);
    }
    if (handle.albumPattern.test(url)) {
      return handle.album(url, request);
    }
    if (handle.songPattern.test(url)) {
      return handle.song(url, request);
    }
    if (handle.podcastPattern.test(url)) {
      return handle.podcast(url, request);
    }
    if (handle.episodePattern.test(url)) {
      return handle.episode(url, request);
    }
    if (handle.bookmarkPattern.test(url)) {
      return handle.bookmark(url, request);
    }
    if (handle.artworkPattern.test(url)) {
      return handle.artwork(url, request);
    }
    if (handle.audioPattern.test(url)) {
      return handle.audio(url, request);
    }
    if (env.dev()) {
      const viteURL = new URL(
        `http://${env.get('HOSTNAME')}:${env.get('DEV_PORT')}`
      );
      const kitURL = new URL(url.pathname, viteURL);
      kitURL.search = url.search;
      return fetch(kitURL, request);
    }
    const skURL = new URL(url.pathname, env.get('ORIGIN'));
    skURL.search = url.search;
    return handle.sveltekit(new Request(skURL, request), info);
  };

  const onListen = () => {
    log.info(`🚀 Launched: http://${hostname}:${port}`);
  };

  const onError = (err: unknown): Promise<Response> => {
    if (err && env.dev()) {
      log.error(err);
    }
    return Promise.resolve(
      new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
        headers: handle.getHeaders()
      })
    );
  };

  Deno.serve(
    {
      port,
      hostname,
      signal: controller.signal,
      onListen,
      onError
    },
    handler
  );
};
