/// <reference lib="WebWorker"/>

import type {CacheLog} from '../types.ts';

const postLog = (msg: CacheLog) => {
  self.postMessage(msg);
};

export const log = {
  prefix: '⚙️  ',
  debug: (msg: string) => {
    postLog({
      type: 'log',
      level: 'debug',
      msg: `${log.prefix}${msg}`
    });
  },
  info: (msg: string) => {
    postLog({
      type: 'log',
      level: 'info',
      msg: `${log.prefix}${msg}`
    });
  },
  warning: (msg: string) => {
    postLog({
      type: 'log',
      level: 'warning',
      msg: `${log.prefix}${msg}`
    });
  },
  error: (msg: string) => {
    postLog({
      type: 'log',
      level: 'error',
      msg: `${log.prefix}${msg}`
    });
  }
};
