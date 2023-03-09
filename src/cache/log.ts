/// <reference lib="WebWorker"/>

export const log = {
  prefix: '⚙️  ',
  debug: (msg: string) => {
    self.postMessage({
      type: 'log',
      level: 'debug',
      msg: `${log.prefix}${msg}`
    });
  },
  info: (msg: string) => {
    self.postMessage({
      type: 'log',
      level: 'info',
      msg: `${log.prefix}${msg}`
    });
  },
  warning: (msg: string) => {
    self.postMessage({
      type: 'log',
      level: 'warning',
      msg: `${log.prefix}${msg}`
    });
  },
  error: (msg: string) => {
    self.postMessage({
      type: 'log',
      level: 'error',
      msg: `${log.prefix}${msg}`
    });
  }
};
