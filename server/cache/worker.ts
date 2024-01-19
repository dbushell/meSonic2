/// <reference lib="WebWorker"/>

import * as fs from 'fs';
import * as path from 'path';
import * as mediaTypes from 'media_types';
import * as env from '../library/env.ts';
import {Queue} from 'carriageway';
import {encodeHex} from 'hex';
import type {
  CacheMessage,
  CacheOptions,
  CacheItem,
  CacheMeta,
  CacheResponse
} from '../types.ts';
import {log} from './log.ts';

const SECOND = 1e3;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;

const cacheDir = path.join(env.get('DATA_DIR'), 'cache');

const cacheExt = new Set(['.json', '.avif', '.webp', '.png', '.jpeg', '.jpg']);

const cacheMetaPath = path.join(env.get('DATA_DIR'), 'cache.json');

await fs.ensureFile(cacheMetaPath);

const cacheMeta = JSON.parse(
  (await Deno.readTextFile(cacheMetaPath)) || '{}'
) as CacheMeta;

const queue = new Queue<CacheItem, boolean>({
  concurrency: 5
});

// Prioritize fetch queue items by content type
const sortValue = (item: CacheItem) => {
  if (item.options.accept[0].startsWith('application/json')) return 1;
  if (item.options.accept[0].startsWith('image/')) return 2;
  if (item.options.accept[0].startsWith('audio/')) return 4;
  return 3;
};

const hash = async (str: string) =>
  encodeHex(
    new Uint8Array(
      await crypto.subtle.digest('sha-1', new TextEncoder().encode(str))
    )
  );

const sendMessage = (msg: CacheMessage) => {
  self.postMessage(msg);
};

log.info(`Cache worker ready`);

sendMessage({type: 'ready'});

self.addEventListener('message', (ev: MessageEvent<CacheMessage>) => {
  if (ev.data.type === 'check') {
    return handleCheck(ev.data.url!);
  }
  if (ev.data.type === 'cleanup') {
    return handleCleanup();
  }
  if (ev.data.type === 'close') {
    return handleClose();
  }
  if (ev.data.type === 'delete') {
    return handleDelete(ev.data.name!);
  }
  if (ev.data.type === 'fetch') {
    return handleFetch(ev.data.url!, ev.data.options);
  }
});

const handleCheck = (url: string) => {
  const props: CacheMessage = {
    type: 'check',
    meta: null,
    url
  };
  if (Object.hasOwn(cacheMeta, url)) {
    props.meta = structuredClone(cacheMeta[url]);
  }
  sendMessage(props);
};

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
      if (age > WEEK * 8) {
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
  sendMessage({type: 'cleanup'});
};

const handleClose = async () => {
  await Deno.writeTextFile(cacheMetaPath, JSON.stringify(cacheMeta, null, 2));
  queue.clear();
  queue.getPending().forEach((item) => {
    log.warning(`Abort fetch (${item.url})`);
    item.controller.abort();
  });
  log.warning(`Close cache`);
  sendMessage({type: 'close'});
  self.close();
};

const handleDelete = async (name: string) => {
  try {
    const cacheName = await hash(name);
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

const handleFetch = async (
  url: string,
  options: Partial<CacheOptions> = {}
) => {
  const cacheName = await hash(options.name ?? url);
  const cachePath = path.join(cacheDir, cacheName);
  const item: CacheItem = {
    url,
    name: cacheName,
    path: cachePath,
    options: {
      compress: options.compress ?? true,
      maxAge: options.maxAge ?? HOUR,
      accept: options.accept ?? ['application/json'],
      prefetch: options.prefetch ?? false
    } as CacheOptions,
    controller: new AbortController()
  };
  queue.append(item, fetchAndCache);
  queue.sort((a, b) => sortValue(a) - sortValue(b));
};

const fetchAndCache = async (item: CacheItem): Promise<boolean> => {
  const {url} = item;
  if (item.controller.signal.aborted) {
    log.warning(`Aborted fetch (${url})`);
    return false;
  }
  try {
    // Validate URL before fetch
    new URL(url);
    // Return from cache if available
    if (fetchFromCache(item)) {
      return true;
    }
    await fetchFromFresh(item);
    return true;
  } catch (error) {
    delete cacheMeta[url];
    await Deno.remove(item.path).catch(() => {});
    log.warning(`Fail (${url})`);
    sendMessage({type: 'fetch', url, error} as CacheResponse);
    return false;
  }
};

export const fetchFromCache = (item: CacheItem): boolean => {
  const {url, name, options} = item;
  if (!Object.hasOwn(cacheMeta, url)) {
    return false;
  }
  const cached = cacheMeta[url];
  if (cached.name !== name) {
    log.warning(`Name mismatch "${name}" : "${cached.name}" (${url})`);
    delete cacheMeta[url];
    return false;
  }
  const age = Date.now() - new Date(cached.created).getTime();
  if (age > options.maxAge || age > DAY * 60) {
    delete cacheMeta[url];
    return false;
  }
  const message: CacheResponse = {
    type: 'fetch',
    url,
    body: options.prefetch ? null : item.path,
    headers: {
      'content-type': cached.contentType,
      'x-cache': 'HIT',
      'x-cache-location': item.path
    }
  };
  if (cached.compressed) {
    message.headers['content-encoding'] = 'gzip';
  }
  log.debug(`Hit (${url})`);
  sendMessage(message);
  return true;
};

export const fetchFromFresh = async (item: CacheItem): Promise<void> => {
  const {url, options} = item;
  log.debug(`Miss (${JSON.stringify({url, ...options})})`);
  const headers = new Headers();
  headers.set('accept', options.accept.join(', '));
  // Fetch response
  const response = await fetch(url, {
    signal: item.controller.signal,
    headers
  });
  if (!response.ok || !response.body) {
    throw new Error(
      `${response.status} ${response.statusText}: ${await response.text()}`
    );
  }
  // Validate content type or infer from file extension
  let contentType = response.headers.get('content-type') ?? '';
  contentType = mediaTypes.contentType(contentType) ?? '';
  if (
    !options.accept
      .map((type) => type.split(';')[0])
      .includes(contentType.split(';')[0])
  ) {
    let ext = path.extname(url);
    if (options.accept[0] === 'application/json') {
      ext = '.json';
    }
    if (cacheExt.has(ext)) {
      contentType = mediaTypes.contentType(ext) ?? '';
    }
  }
  cacheMeta[url] = {
    contentType,
    name: item.name,
    compressed: options.compress,
    created: new Date().toISOString()
  };
  const message: CacheResponse = {
    type: 'fetch',
    url,
    body: options.prefetch ? null : item.path,
    headers: {
      'content-type': contentType,
      'x-cache': 'MISS',
      'x-cache-location': item.path
    }
  };
  try {
    const file = await Deno.open(item.path, {
      write: true,
      create: true,
      truncate: true
    });
    let stream = response.body;
    if (options.compress) {
      stream = response.body.pipeThrough(new CompressionStream('gzip'));
      message.headers['content-encoding'] = 'gzip';
    }
    await stream.pipeTo(file.writable);
  } catch (err) {
    log.error(`Fresh (${url})`);
    await Deno.remove(item.path);
    delete cacheMeta[url];
    throw new Error(err);
  }
  sendMessage(message);
};
