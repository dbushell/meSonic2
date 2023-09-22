import * as log from 'log';
import * as dotenv from 'dotenv';

await dotenv.load({export: true});

const prefixes = ['APP', 'DENO'];

const expected = [
  'APP_API_SECRET',
  'APP_SRC_DIR',
  'APP_DATA_DIR',
  'APP_MEDIA_DIR',
  'APP_BUILD_DIR',
  'APP_ORIGIN',
  'APP_DEV',
  'APP_DEV_PORT',
  'APP_PORT',
  'APP_HOSTNAME',
  'APP_LOG_LEVEL',
  'APP_LOG_LOCALE',
  'APP_PODCASTINDEX_USERAGENT',
  'APP_PODCASTINDEX_APIKEY',
  'APP_PODCASTINDEX_SECRET'
];

const emoji = '🌱';

export const check = (): boolean => {
  const missing = expected.filter((key) => !Deno.env.has(key));
  if (missing.length) {
    log.critical(
      `${emoji} Missing env vars: ${missing.map((k) => `"${k}"`).join(', ')}`
    );
    return false;
  }
  log.info(`${emoji} env var check passed`);
  return true;
};

export const get = (key: string): string => {
  const prefix = key.split('_')[0];
  if (!prefixes.includes(prefix)) {
    key = `APP_${key}`;
  }
  if (!expected.includes(key)) {
    log.warning(`${emoji} Unknown env var: "${key}"`);
  }
  if (!Deno.env.has(key)) {
    log.warning(`${emoji} Missing env var: "${key}"`);
  }
  return Deno.env.get(key) ?? '';
};

export const dev = (): boolean => {
  return Deno.env.get('APP_DEV') === 'true';
};
