/// <reference lib="WebWorker"/>

import * as fs from 'fs';
import * as hex from 'hex';
import * as path from 'path';
import * as base58 from 'base58';
import * as mediaTypes from 'media_types';
import * as env from '../library/env.ts';
import * as timer from '../library/timer.ts';
import {CacheOptions, CacheItem, CacheMeta, CacheResponse} from '../types.ts';
import {log} from './log.ts';

const cacheDir = path.join(env.get('DATA_DIR'), 'cache');

const cacheExt = new Set(['.json', '.avif', '.webp', '.png', '.jpeg', '.jpg']);

const sha1Hash = async (str: string) => {
  return new TextDecoder().decode(
    hex.encode(
      new Uint8Array(
        await crypto.subtle.digest('sha-1', new TextEncoder().encode(str))
      )
    )
  );
};

const cacheMetaPath = path.join(env.get('DATA_DIR'), 'cache.json');

await fs.ensureFile(cacheMetaPath);

const cacheMeta = JSON.parse(
  (await Deno.readTextFile(cacheMetaPath)) || '{}'
) as CacheMeta;

// Fetch requests being processed
const fetchActive = new Map<string, CacheItem>();

// Fetch requests waiting to be processed
const fetchQueue: Array<CacheItem> = [];

// Add next fetch request to queue
const fetchNext = () => {
  if (fetchQueue.length < 1 || fetchActive.size >= 5) {
    return;
  }
  const item = fetchQueue.shift()!;
  fetchActive.set(item.id, item);
  item.callback();
};

log.info(`Cache worker ready`);
self.postMessage({type: 'ready'});

self.addEventListener('message', async (ev: MessageEvent) => {
  if (ev.data.type === 'fetch') {
    return await handleFetch(ev.data.id, ev.data.options);
  }
  if (ev.data.type === 'delete') {
    return handleDelete(ev.data.name);
  }
  if (ev.data.type === 'close') {
    return handleClose();
  }
  if (ev.data.type === 'cleanup') {
    return handleCleanup();
  }
  if (ev.data.type === 'check') {
    const props = {
      type: 'check',
      id: ev.data.id,
      meta: null
    };
    if (Object.hasOwn(cacheMeta, ev.data.id)) {
      props.meta = structuredClone(cacheMeta[ev.data.id]);
    }
    self.postMessage(props);
    return;
  }
});

const handleCleanup = async () => {
  log.debug(`Cleanup cache`);
  for (const [id, entry] of Object.entries(cacheMeta)) {
    try {
      const cachePath = path.join(cacheDir, entry.name);
      const stat = await Deno.stat(cachePath);
      if (!stat.isFile) {
        await Deno.remove(cachePath);
        throw new Error('unknown');
      }
      const age = Date.now() - new Date(entry.created).getTime();
      if (age > timer.WEEK * 8) {
        await Deno.remove(cachePath);
        throw new Error('outdated');
      }
    } catch (err) {
      log.warning(`Remove (${entry.name}) (${err})`);
      delete cacheMeta[id];
    }
  }
  try {
    for await (const dirEntry of Deno.readDir(cacheDir)) {
      const known = Object.values(cacheMeta).find(
        (entry) => entry.name === dirEntry.name
      );
      if (!known) {
        await Deno.remove(path.join(cacheDir, dirEntry.name));
      }
    }
  } catch (err) {
    log.error(err);
  }
  await Deno.writeTextFile(cacheMetaPath, JSON.stringify(cacheMeta, null, 2));
  self.postMessage({type: 'cleanup'});
};

const handleClose = async () => {
  await Deno.writeTextFile(cacheMetaPath, JSON.stringify(cacheMeta, null, 2));
  fetchActive.forEach((item) => {
    log.warning(`Abort fetch (${item.id})`);
    item.controller.abort();
  });
  fetchQueue.forEach((item) => item.controller.abort());
  log.warning(`Close cache`);
  self.postMessage({type: 'close'});
  self.close();
};

const handleDelete = async (name: string) => {
  try {
    const cacheName = await sha1Hash(name);
    const cachePath = path.join(cacheDir, cacheName);
    for (const key of Object.keys(cacheMeta)) {
      if (cacheMeta[key].name === cacheName) {
        delete cacheMeta[key];
      }
    }
    await Deno.remove(cachePath);
    log.warning(`Delete cache (${name})`);
  } catch {
    log.debug(`Not cached (${name})`);
  }
};

const handleFetch = async (id: string, options: CacheOptions) => {
  const cacheName = await sha1Hash(options.name ?? id);
  const cachePath = path.join(cacheDir, cacheName);
  const item = {
    id,
    name: cacheName,
    path: cachePath,
    options: {
      compress: options.compress ?? true,
      maxAge: options.maxAge ?? timer.HOUR,
      accept: options.accept ?? ['application/json'],
      prefetch: options.prefetch ?? false
    } as CacheOptions,
    controller: new AbortController(),
    callback: () =>
      fetchAndCache(id).finally(() => {
        fetchActive.delete(item.id);
        fetchNext();
      })
  };
  // Skip queue if JSON
  if (item.options.accept[0] === 'application/json') {
    fetchActive.set(item.id, item);
    item.callback();
  } else {
    fetchQueue.push(item);
  }
  fetchNext();
};

const fetchAndCache = async (id: string) => {
  const item = fetchActive.get(id);
  if (!item) {
    log.warning(`Lost fetch (${id})`);
    return;
  }
  if (item.controller.signal.aborted) {
    log.warning(`Aborted fetch (${id})`);
    return;
  }
  try {
    // Validate URL before fetch
    new URL(new TextDecoder().decode(base58.decode(id)));
    // Return from cache if available
    if (await fetchFromCache(item)) {
      return;
    }
    await fetchFromFresh(item);
  } catch (error) {
    // TODO: Handle missing file better
    delete cacheMeta[id];
    await Deno.remove(item.path).catch(() => {});
    log.warning(`Fail (${id})`);
    self.postMessage({type: 'fetch', id, error} as CacheResponse);
    return;
  }
};

export const fetchFromCache = async (item: CacheItem): Promise<boolean> => {
  const {id, name, options} = item;
  if (!Object.hasOwn(cacheMeta, id)) {
    return false;
  }
  const cached = cacheMeta[id];
  if (cached.name !== name) {
    log.warning(`Name mismatch "${name}" : "${cached.name}" (${id})`);
    delete cacheMeta[id];
    return false;
  }
  const age = Date.now() - new Date(cached.created).getTime();
  if (age > options.maxAge || age > timer.DAY * 60) {
    delete cacheMeta[id];
    return false;
  }
  const message: CacheResponse = {
    type: 'fetch',
    id,
    headers: {
      'content-type': cached.contentType,
      'x-cache': 'HIT',
      'x-cache-location': item.path
    },
    body: null
  };
  if (cached.compressed) {
    message.headers['content-encoding'] = 'gzip';
  }
  if (options.prefetch) {
    self.postMessage(message);
    return true;
  }
  log.debug(`Hit (${id})`);
  if (cached.compressed) {
    const file = await Deno.open(item.path);
    const stream = file.readable.pipeThrough(new DecompressionStream('gzip'));
    let data = new Uint8Array(0);
    for await (const chunk of stream) {
      const newData = new Uint8Array(data.length + chunk.length);
      newData.set(data);
      newData.set(chunk, data.length);
      data = newData;
    }
    message.body = data.buffer;
  } else {
    const data = await Deno.readFile(item.path);
    message.body = data.buffer;
  }
  self.postMessage(message, [message.body]);
  return true;
};

export const fetchFromFresh = async (item: CacheItem): Promise<void> => {
  const {id, options} = item;
  const url = new URL(new TextDecoder().decode(base58.decode(id)));
  log.debug(`Miss (${JSON.stringify({url: url.href, ...options})})`);
  // Add authorization headers for known hosts
  const headers = new Headers();
  await addHeaders(headers, url);
  headers.set('accept', options.accept.join(', '));
  // Fetch response
  const response = await fetch(url.href, {
    signal: item.controller.signal,
    headers
  });
  if (!response.ok || !response.body) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  // Validate content type or infer from file extension
  let contentType = response.headers.get('content-type') ?? '';
  contentType = mediaTypes.contentType(contentType) ?? '';
  if (
    !options.accept
      .map((type) => type.split(';')[0])
      .includes(contentType.split(';')[0])
  ) {
    let ext = path.extname(url.href);
    if (options.accept[0] === 'application/json') {
      ext = '.json';
    }
    if (cacheExt.has(ext)) {
      contentType = mediaTypes.contentType(ext) ?? '';
    }
  }
  cacheMeta[id] = {
    contentType,
    name: item.name,
    compressed: options.compress,
    created: new Date().toISOString()
  };
  const message: CacheResponse = {
    type: 'fetch',
    id,
    headers: {
      'content-type': contentType,
      'x-cache': 'MISS',
      'x-cache-location': item.path
    },
    body: null
  };
  message.body = await response.arrayBuffer();
  let cacheData = new Uint8Array(message.body);
  if (options.compress) {
    message.headers['content-encoding'] = 'gzip';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(cacheData);
        controller.close();
      }
    }).pipeThrough(new CompressionStream('gzip'));
    let data = new Uint8Array(0);
    for await (const chunk of stream) {
      const newData = new Uint8Array(data.length + chunk.length);
      newData.set(data);
      newData.set(chunk, data.length);
      data = newData;
    }
    cacheData = data;
  }
  await fs.ensureFile(item.path);
  await Deno.writeFile(item.path, cacheData);
  if (options.prefetch) {
    self.postMessage(message);
  } else {
    self.postMessage(message, [message.body]);
  }
};

const addHeaders = async (headers: Headers, url: URL) => {
  if (
    url.hostname === 'api.podcastindex.org' &&
    url.pathname.startsWith('/api')
  ) {
    const authUserAgent = env.get('PODCASTINDEX_USERAGENT');
    const authKey = env.get('PODCASTINDEX_APIKEY');
    const authDate = Math.floor(Date.now() / 1000).toString();
    const authorization = await sha1Hash(
      `${authKey}${env.get('PODCASTINDEX_SECRET')}${authDate}`
    );
    headers.set('user-agent', authUserAgent);
    headers.set('x-auth-key', authKey);
    headers.set('x-auth-date', authDate);
    headers.set('authorization', authorization);
  }
};
