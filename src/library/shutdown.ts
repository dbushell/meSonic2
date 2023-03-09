import * as log from 'log';
import * as async from 'async';
import * as db from '../database/mod.ts';
import * as cache from '../cache/mod.ts';
import * as server from './server.ts';
import * as timer from './timer.ts';

const unload = async.deferred<void>();
let activated = false;

const beforeUnload = async () => {
  log.critical('💀 Shutdown activated');
  timer.clearAllTimers();
  await cache.close();
  server.close();
  db.close();
  log.getLogger().handlers.forEach((handler) => {
    if (handler instanceof log.handlers.FileHandler) {
      handler.flush();
    }
  });
  unload.resolve();
};

export const now = async () => {
  if (activated) return;
  activated = true;
  beforeUnload();
  await unload;
  Deno.exit();
};

export const setup = () => {
  Deno.addSignalListener('SIGTERM', now);
  Deno.addSignalListener('SIGINT', now);
};
