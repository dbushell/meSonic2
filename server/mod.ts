import * as env from './library/env.ts';
import * as db from './database/mod.ts';
import * as cache from './cache/mod.ts';
import * as api from './library/api.ts';
import * as media from './library/media.ts';
import * as timer from './library/timer.ts';
import * as server from './library/server.ts';
import * as shutdown from './library/shutdown.ts';
import './library/log.ts';

shutdown.setup();

// Something is missing...
if (!env.check()) await shutdown.now();

db.cleanupBookmarks();

timer.setTimer(
  'media sync',
  timer.HOUR,
  async () => {
    await media.syncMedia();
  },
  true,
  true
);


timer.setTimer(
  'podcast sync',
  timer.HOUR,
  async () => {
    const tasks: Promise<unknown>[] = [];
    db.getPodcast().forEach((podcast) => {
      tasks.push(api.syncPodcast(podcast));
    });
    await Promise.all(tasks);
  },
  true,
  true
);

timer.setTimer(
  'cache cleanup start',
  timer.MINUTE * 30,
  () => {
    timer.setTimer(
      'cache cleanup',
      timer.HOUR,
      async () => {
        await cache.cleanup();
      },
      true,
      true
    );
  },
  false,
  false
);


server.serve({
  port: Number.parseInt(env.get('PORT')),
  hostname: env.get('HOSTNAME')
});
