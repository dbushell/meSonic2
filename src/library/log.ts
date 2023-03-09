import * as fs from 'fs';
import * as log from 'log';
import * as path from 'path';
import * as env from './env.ts';

const logDir = path.join(env.get('DATA_DIR'), 'logs');
const logLevel = env.get('LOG_LEVEL') as log.LevelName;
const logLocale = env.get('LOG_LOCALE');

await fs.ensureDir(logDir);

const dateFormat = new Intl.DateTimeFormat(logLocale, {
  dateStyle: 'short'
});

const timeFormat = new Intl.DateTimeFormat(logLocale, {
  hour12: false,
  timeStyle: 'medium'
});

const logFormat = (record: log.LogRecord) =>
  `${dateFormat.format(record.datetime)} ${timeFormat.format(
    record.datetime
  )} ${record.msg}`;

log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler(logLevel, {
      formatter: logFormat
    }),
    file: new log.handlers.RotatingFileHandler('DEBUG', {
      formatter: logFormat,
      filename: path.join(logDir, 'debug.log'),
      maxBytes: 1024 * 1024 * 1,
      maxBackupCount: 10
    })
  },
  loggers: {
    default: {
      level: logLevel,
      handlers: ['console', 'file']
    },
    debug: {
      level: 'DEBUG',
      handlers: ['console', 'file']
    }
  }
});
