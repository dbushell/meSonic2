import * as log from 'log';
import * as async from 'async';
import * as base58 from 'base58';
import {
  CacheOptions,
  CacheResponse,
  CacheMetaEntry,
  Podcast,
  Episode
} from '../types.ts';

const fetchMap = new Map<string, async.Deferred<Response>>();

const workerMap = new Map<string, async.Deferred<unknown>>();
workerMap.set('ready', async.deferred<boolean>());
workerMap.set('closed', async.deferred<boolean>());

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module'
});

worker.addEventListener('message', (ev: MessageEvent) => {
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
    const id = `check:${ev.data.id}`;
    if (workerMap.has(id)) {
      workerMap.get(id)!.resolve(ev.data.meta);
      workerMap.delete(id);
    }
  }
  if (ev.data.type === 'log') {
    const level: 'debug' | 'info' | 'warning' | 'error' = ev.data.level;
    if (level === 'debug') {
      log.getLogger('debug').debug(ev.data.msg);
    } else {
      log[level](ev.data.msg);
    }
  }
  if (ev.data.type === 'fetch') {
    const data: CacheResponse = ev.data;
    if (!fetchMap.has(data.id)) {
      log.error(`Unknown ID (${data.id})`);
      return;
    }
    const promise = fetchMap.get(data.id)!;
    fetchMap.delete(data.id);
    if (Object.hasOwn(data, 'body')) {
      promise.resolve(
        new Response(data.body, {
          headers: new Headers(data.headers)
        })
      );
      return;
    }
    promise.reject(data.error);
  }
});

worker.addEventListener('error', (ev: Event) => {
  log.error(ev);
});

export const close = async () => {
  worker.postMessage({type: 'close'});
  await workerMap.get('closed')!;
  worker.terminate();
};

export const cleanup = (): Promise<boolean> => {
  if (!workerMap.has('cleanup')) {
    workerMap.set('cleanup', async.deferred<boolean>());
    worker.postMessage({type: 'cleanup'});
  }
  return workerMap.get('cleanup')! as Promise<boolean>;
};

export const check = (url: URL): Promise<CacheMetaEntry | null> => {
  const id = base58.encode(url.href);
  const mapId = `check:${base58.encode(url.href)}`;
  if (!workerMap.has(mapId)) {
    workerMap.set(mapId, async.deferred<CacheMetaEntry | null>());
    worker.postMessage({type: 'check', id});
  }
  return workerMap.get(mapId)! as Promise<CacheMetaEntry | null>;
};

export const fetchCache = async (
  url: URL,
  options: Partial<CacheOptions> = {}
): Promise<Response> => {
  const id = base58.encode(url.href);
  if (fetchMap.has(id)) {
    return fetchMap.get(id)!;
  }
  await workerMap.get('ready')!;
  const promise = async.deferred<Response>();
  fetchMap.set(id, promise);
  worker.postMessage({
    type: 'fetch',
    options,
    id
  });
  return promise;
};

addEventListener('podcast:remove', ((event: CustomEvent<Podcast>) => {
  const podcast = event.detail;
  worker.postMessage({
    type: 'delete',
    name: `artwork:${podcast.id}`
  });
}) as EventListener);

addEventListener('episode:remove', ((event: CustomEvent<Episode>) => {
  const episode = event.detail;
  worker.postMessage({
    type: 'delete',
    name: `audio:${episode.id}`
  });
}) as EventListener);
