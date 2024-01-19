import * as log from 'log';
import * as env from './env.ts';
import * as handle from './handle.ts';
import {Router} from 'velocirouter';

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

const router = new Router<Deno.ServeHandlerInfo>({
  onNoMatch: () => {
    return new Response(null, {status: 400});
  }
});

router.get({pathname: '/api/artist/:id'}, handle.artist);
router.get({pathname: '/api/album/:id'}, handle.album);
router.get({pathname: '/api/song/:id'}, handle.song);
router.get({pathname: '/api/episode/:id'}, handle.episode);
router.get({pathname: '/api/podcast/:id'}, handle.podcast);
router.post({pathname: '/api/podcast/:id'}, handle.podcast);
router.get({pathname: '/api/bookmark/:id'}, handle.bookmark);
router.post({pathname: '/api/bookmark/:id'}, handle.bookmark);
router.get({pathname: '/artwork/:id'}, handle.artwork);
router.get({pathname: '/audio/:id'}, handle.audio);

export const serve = (options: ServeOptions) => {
  if (controller) {
    controller.abort();
  }
  port = options.port ?? 3000;
  hostname = options.hostname ?? 'localhost';
  controller = new AbortController();

  log.info(`${emoji} Listening: http://${hostname}:${port}`);

  const handler = async (
    request: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> => {
    const url = new URL(request.url);
    const response = await router.handle(request, info);
    if (response.ok || response.status !== 400) {
      return response;
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
