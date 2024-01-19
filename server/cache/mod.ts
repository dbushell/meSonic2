import * as log from 'log';
import type {
  CacheMessage,
  CacheLog,
  CacheOptions,
  CacheResponse,
  CacheMetaEntry,
  Podcast,
  Episode,
  Deferred
} from '../types.ts';

const fetchMap = new Map<string, Deferred<Response>>();

// deno-lint-ignore no-explicit-any
const workerMap = new Map<string, Deferred<any>>();
workerMap.set('ready', Promise.withResolvers<boolean>());
workerMap.set('closed', Promise.withResolvers<boolean>());

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module'
});

const workerMessage = (msg: CacheMessage) => {
  worker.postMessage(msg);
};

worker.addEventListener('message', async (ev: MessageEvent<CacheMessage>) => {
  if (ev.data.type === 'ready') {
    workerMap.get('ready')!.resolve(true);
  }
  if (ev.data.type === 'close') {
    workerMap.get('closed')!.resolve(true);
  }
  if (ev.data.type === 'cleanup') {
    if (workerMap.has('cleanup')) {
      workerMap.get('cleanup')!.resolve(true);
      workerMap.delete('cleanup');
    }
  }
  if (ev.data.type === 'check') {
    const url = `check:${ev.data.url}`;
    if (workerMap.has(url)) {
      workerMap.get(url)!.resolve(ev.data.meta ?? null);
      workerMap.delete(url);
    }
  }
  if (ev.data.type === 'log') {
    const data = ev.data as CacheLog;
    const level: 'debug' | 'info' | 'warning' | 'error' = data.level;
    if (level === 'debug') {
      log.getLogger('debug').debug(data.msg);
    } else {
      log[level](data.msg);
    }
  }
  if (ev.data.type === 'fetch') {
    const data = ev.data as CacheResponse;
    if (!fetchMap.has(data.url)) {
      log.error(`Unknown URL (${data.url})`);
      return;
    }
    const promise = fetchMap.get(data.url)!;
    fetchMap.delete(data.url);
    if (!Object.hasOwn(data, 'body')) {
      promise.reject(data.error);
    }
    if (data.body === null) {
      promise.resolve(
        new Response(null, {
          headers: new Headers(data.headers)
        })
      );
      return;
    }
    try {
      const file = await Deno.open(data.body, {read: true});
      const {rid} = file;
      let stream = file.readable;
      if (data.headers['content-encoding'] === 'gzip') {
        stream = stream.pipeThrough(new DecompressionStream('gzip'));
      }
      data.headers['x-cache-rid'] = String(rid);
      promise.resolve(
        new Response(stream, {
          headers: new Headers(data.headers)
        })
      );
      // TODO: is this necessary?
      setTimeout(() => {
        try {
          Deno.close(rid);
          log.debug(`Unused stream: ${JSON.stringify(data)}`);
        } catch {
          // Do nothing...
        }
      }, 1000 * 30);
    } catch (err) {
      promise.reject(err);
    }
  }
});

worker.addEventListener('error', (ev: Event) => {
  log.error(ev);
});

export const close = async () => {
  workerMessage({type: 'close'});
  await workerMap.get('closed')!.promise;
  worker.terminate();
};

export const cleanup = (): Promise<boolean> => {
  if (!workerMap.has('cleanup')) {
    workerMap.set('cleanup', Promise.withResolvers<boolean>());
    workerMessage({type: 'cleanup'});
  }
  return workerMap.get('cleanup')!.promise as Promise<boolean>;
};

export const check = (url: URL): Promise<CacheMetaEntry | null> => {
  const mapId = `check:${url.href}`;
  if (!workerMap.has(mapId)) {
    workerMap.set(mapId, Promise.withResolvers<CacheMetaEntry | null>());
    workerMessage({type: 'check', url: url.href});
  }
  return workerMap.get(mapId)!.promise as Promise<CacheMetaEntry | null>;
};

export const fetchCache = async (
  url: URL,
  options: Partial<CacheOptions> = {}
): Promise<Response> => {
  if (fetchMap.has(url.href)) {
    return fetchMap.get(url.href)!.promise;
  }
  await workerMap.get('ready')!.promise;
  const deferred = Promise.withResolvers<Response>();
  fetchMap.set(url.href, deferred);

  workerMessage({
    type: 'fetch',
    url: url.href,
    options
  });
  return deferred.promise;
};

addEventListener('podcast:remove', ((event: CustomEvent<Podcast>) => {
  const podcast = event.detail;
  workerMessage({
    type: 'delete',
    name: `artwork:${podcast.id}`
  });
}) as EventListener);

addEventListener('episode:remove', ((event: CustomEvent<Episode>) => {
  const episode = event.detail;
  workerMessage({
    type: 'delete',
    name: `audio:${episode.id}`
  });
}) as EventListener);
