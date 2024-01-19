import * as log from 'log';
import * as env from './library/env.ts';
import * as db from './database/mod.ts';
import * as cache from './cache/mod.ts';
import * as api from './library/api.ts';
import * as media from './library/media.ts';
import * as server from './library/server.ts';
import * as shutdown from './library/shutdown.ts';
import './library/log.ts';

shutdown.setup();

// Something is missing...
if (!env.check()) await shutdown.now();

addEventListener('unhandledrejection', (error: PromiseRejectionEvent) => {
  error.preventDefault();
  console.error(error.reason);
});

db.cleanupBookmarks();

const mediaSync = async () => {
  const start = performance.now();
  await media.syncMedia();
  const time = (performance.now() - start).toFixed(2);
  log.getLogger('debug').debug(`⏱️ media sync (${time}ms)`);
};

const podcastSync = async () => {
  const start = performance.now();
  const tasks: Promise<unknown>[] = [];
  db.getPodcast().forEach((podcast) => {
    tasks.push(api.syncPodcast(podcast));
  });
  await Promise.allSettled(tasks);
  const time = (performance.now() - start).toFixed(2);
  log.info(`⏱️ podcast sync (${time}ms)`);
};

const cacheCleanup = async () => {
  const start = performance.now();
  await cache.cleanup();
  const time = (performance.now() - start).toFixed(2);
  log.getLogger('debug').debug(`⏱️ cache cleanup (${time}ms)`);
};

Deno.cron('media sync', '0 * * * *', {}, mediaSync);
Deno.cron('podcast sync', {minute: {every: 15}}, {}, podcastSync);
Deno.cron('cache cleanup', '50 * * * *', {}, cacheCleanup);

// Sync media now if not due in 5 minutes
if (new Date().getMinutes() < 50) {
  mediaSync();
}

// Sync podcasts now if not due in 5 minutes
if (new Date().getMinutes() % 15 < 10) {
  podcastSync();
}

server.serve({
  port: Number.parseInt(env.get('PORT')),
  hostname: env.get('HOSTNAME')
});
