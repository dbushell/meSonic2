import * as log from 'log';
import * as db from '../database/mod.ts';
import * as cache from '../cache/mod.ts';
import * as server from './server.ts';

const unload = Promise.withResolvers<void>();
let activated = false;

const beforeUnload = async () => {
  log.critical('💀 Shutdown activated');
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
  await unload.promise;
  Deno.exit();
};

export const setup = () => {
  Deno.addSignalListener('SIGTERM', now);
  Deno.addSignalListener('SIGINT', now);
};
