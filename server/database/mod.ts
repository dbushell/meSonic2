import * as fs from 'fs';
import * as log from 'log';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import * as env from '../library/env.ts';

export * from './artist.ts';
export * from './album.ts';
export * from './song.ts';
export * from './podcast.ts';
export * from './episode.ts';
export * from './bookmark.ts';
export * from './metadata.ts';

const emoji = '💾';

const dbDir = path.join(env.get('DATA_DIR'), 'database');
const dbPath = path.join(dbDir, 'app.db');

await fs.ensureDir(dbDir);

export const db = new sqlite3.Database(dbPath);

let ver = db.prepare('PRAGMA user_version').value<number[]>();

log.info(`${emoji} DB (${ver}): ${dbPath}`);
log.info(`${emoji} SQLite: ${db.prepare('SELECT sqlite_version()').value()}`);

try {
  if (!ver || ver[0] === 0) {
    log.info(`${emoji} Exec schema 001`);
    const sql = await Deno.readTextFile(
      path.join(env.get('SRC_DIR'), 'server/schema/001.sql')
    );
    db.exec(sql);
    ver = [1];
  }
  if (ver && ver[0] === 1) {
    log.info(`${emoji} Exec schema 002`);
    const sql = await Deno.readTextFile(
      path.join(env.get('SRC_DIR'), 'server/schema/002.sql')
    );
    db.exec(sql);
    ver = [2];
  }
} catch (err) {
  log.critical(err);
  Deno.exit();
}

export const close = () => {
  log.warning(`${emoji} Close database`);
  db.close();
};
