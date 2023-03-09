import * as path from 'path';
import * as hex from 'hex';
import * as env from '../library/env.ts';

export const cacheDir = path.join(env.get('DATA_DIR'), 'cache');

export const cacheExt = new Set([
  '.json',
  '.avif',
  '.webp',
  '.png',
  '.jpeg',
  '.jpg'
]);

export const sha1Hash = async (str: string) => {
  return new TextDecoder().decode(
    hex.encode(
      new Uint8Array(
        await crypto.subtle.digest('sha-1', new TextEncoder().encode(str))
      )
    )
  );
};
