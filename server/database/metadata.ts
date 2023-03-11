import * as log from 'log';
import * as uuid from 'uuid';
import {BindValue} from 'sqlite3';
import {db} from './mod.ts';
import {
  Metadata,
  GetMetadata,
  AddMetadata,
  RemoveMetadata,
  UpdateMetadata,
  Episode,
  Podcast
} from '../types.ts';

const emoji = '🖍️ ';

export const getMetadata = (params: GetMetadata = {}): Metadata[] => {
  if (params.id && !uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return [];
  }
  if (params.parent_id && !uuid.validate(params.parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${params.parent_id})`);
    return [];
  }
  try {
    let sql = 'SELECT * FROM metadata';
    if (params.id) {
      sql += ' WHERE id=:id';
      if (params.key) {
        sql += ' AND key=:key';
      }
      sql += ' LIMIT 1';
    } else if (params.parent_id) {
      sql += ' WHERE parent_id=:parent_id';
      if (params.key) {
        sql += ' AND key=:key';
      }
      sql += ' ORDER BY datetime(modified_at) DESC';
    } else {
      sql += ' ORDER BY datetime(modified_at) DESC';
    }
    const query = db.prepare(sql);
    const metadata = query.all<Metadata>(params as Record<string, BindValue>);
    return metadata;
  } catch (err) {
    log.error(err);
    return [];
  }
};

export const addMetadata = ({
  parent_id,
  parent_type,
  key,
  value
}: AddMetadata): boolean => {
  if (!uuid.validate(parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${parent_id})`);
    return false;
  }
  try {
    const metadata = getMetadata({parent_id, key});
    if (metadata.length > 0) {
      return updateMetadata({
        id: metadata[0].id,
        key,
        value
      });
    }
    log.getLogger('debug').debug(`${emoji} Add metadata (for ${parent_id})`);
    const query = db.prepare(
      'INSERT INTO metadata (id, parent_id, parent_type, key, value) \
        VALUES (:id, :parent_id, :parent_type, :key, :value)'
    );
    const id = crypto.randomUUID();
    const changes = query.run({
      id,
      parent_id,
      parent_type,
      key,
      value
    });
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const removeMetadata = ({id, parent_id}: RemoveMetadata): boolean => {
  if (!id && !parent_id) {
    return false;
  }
  if (id && !uuid.validate(id)) {
    log.warning(`${emoji} Invalid ID (${id})`);
    return false;
  }
  if (parent_id && !uuid.validate(parent_id)) {
    log.warning(`${emoji} Invalid parent ID (${id})`);
    return false;
  }
  try {
    let metadata: Metadata[] = [];
    if (id) {
      metadata = getMetadata({id});
    } else if (parent_id) {
      metadata = getMetadata({parent_id});
    }
    if (!metadata.length) return false;
    log
      .getLogger('debug')
      .debug(`${emoji} Remove metadata (for ${metadata[0].parent_id})`);
    metadata.forEach((metadata) => {
      const query = db.prepare('DELETE FROM metadata WHERE id=:id');
      query.run({id: metadata.id});
    });
    return true;
  } catch (err) {
    log.error(err);
    return false;
  }
};

export const updateMetadata = (params: UpdateMetadata): boolean => {
  if (!uuid.validate(params.id)) {
    log.warning(`${emoji} Invalid ID (${params.id})`);
    return false;
  }
  try {
    log.getLogger('debug').debug(`${emoji} Update metadata (${params.id})`);
    const metadatas = getMetadata({id: params.id});
    if (!metadatas.length) return false;
    const metadata = {
      ...metadatas[0],
      ...params,
      modified_at: new Date().toISOString()
    };
    const query = db.prepare(
      'UPDATE metadata\
      SET modified_at=:modified_at, key=:key, value=:value\
      WHERE id=:id'
    );
    const changes = query.run({
      id: metadata.id,
      modified_at: metadata.modified_at,
      key: metadata.key,
      value: metadata.value
    });
    return changes > 0;
  } catch (err) {
    log.error(err);
    return false;
  }
};

addEventListener('podcast:remove', ((event: CustomEvent<Podcast>) => {
  const podcast = event.detail;
  const metadata = getMetadata({parent_id: podcast.id});
  metadata.forEach((metadata) => {
    removeMetadata({id: metadata.id});
  });
}) as EventListener);

addEventListener('episode:remove', ((event: CustomEvent<Episode>) => {
  const episode = event.detail;
  const metadata = getMetadata({parent_id: episode.id});
  metadata.forEach((metadata) => {
    removeMetadata({id: metadata.id});
  });
}) as EventListener);
