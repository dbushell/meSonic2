/// <reference types="@sveltejs/kit" />
import {build, files, version} from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

// https://kit.svelte.dev/docs/service-workers
const CACHE = `mesonic2-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', ((ev: ExtendableEvent) => {
  self.skipWaiting();
}) as EventListener);

self.addEventListener('activate', ((ev: ExtendableEvent) => {
  ev.waitUntil(self.clients.claim());
  const clearCaches = async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE) {
        await caches.delete(key);
      }
    }
  };
  ev.waitUntil(clearCaches());
}) as EventListener);

self.addEventListener('fetch', async (ev: FetchEvent) => {
  if (ev.request.method !== 'GET') {
    return;
  }
  const url = new URL(ev.request.url);
  let cachable = false;
  if (ASSETS.includes(url.pathname)) {
    cachable = true;
  }
  // if (url.pathname.startsWith('/artwork/')) {
  //   cachable = true;
  // }
  if (!cachable) {
    console.debug(`uncachable: ${url.pathname}`);
    return;
  }
  const cache = await caches.open(CACHE);
  // Try cache first
  let response: Response | undefined;
  response = await cache.match(ev.request);
  if (response) {
    console.debug(`cached: ${url.pathname}`);
    ev.respondWith(response);
    return;
  }
  // Try fetch and cache
  response = await fetch(ev.request);
  if (!response.ok || response.status !== 200 || response.type !== 'basic') {
    ev.respondWith(response);
    return;
  }
  await cache.put(ev.request, response.clone());
  console.debug(`fetched: ${url.pathname}`);
  ev.respondWith(response);
});
