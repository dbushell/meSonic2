import * as fs from 'fs';
import * as log from 'log';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import * as env from '../library/env.ts';

export * from './podcast.ts';
export * from './episode.ts';
export * from './bookmark.ts';
export * from './metadata.ts';
export * from './api.ts';

const emoji = '💾';

const dbDir = path.join(env.get('DATA_DIR'), 'database');
const dbPath = path.join(dbDir, 'app.db');

await fs.ensureDir(dbDir);

export const db = new sqlite3.Database(dbPath);

log.info(`${emoji} DB: ${dbPath}`);
log.info(`${emoji} sqlite: ${db.prepare('SELECT sqlite_version()').value()}`);

const ver = db.prepare('PRAGMA user_version').value<number[]>();

if (!ver || ver[0] === 0) {
  try {
    const sql = await Deno.readTextFile(
      path.join(Deno.cwd(), 'src/schema/001.sql')
    );
    const code = db.exec(sql);
    log.info(`${emoji} Exec schema 001 (${code})`);
  } catch (err) {
    log.critical(err);
    Deno.exit();
  }
}

export const close = () => {
  log.warning(`${emoji} Close database`);
  db.close();
};
