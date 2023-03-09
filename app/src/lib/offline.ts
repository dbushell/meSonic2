import {get} from 'svelte/store';
import {offlineStore} from './stores';
import type {AddOffline} from '$lib/types';

export const loadIndexedDB = async () => {
  const open = globalThis.indexedDB.open('mesonic', 1);
  open.addEventListener('upgradeneeded', (ev: IDBVersionChangeEvent) => {
    open.result.createObjectStore('downloads');
  });
  open.addEventListener('success', (ev: Event) => {
    offlineStore.set({...get(offlineStore), db: open.result});
    updateStore();
  });
  open.addEventListener('error', (ev) => {
    console.log(ev);
  });
};

const updateStore = async (): Promise<void> => {
  return new Promise(async (resolve) => {
    const {db} = get(offlineStore);
    if (!db) {
      console.error('No IDBDatabase');
      return resolve();
    }
    const transaction = db.transaction(['downloads'], 'readwrite');
    const downloads = transaction.objectStore('downloads');
    const request = downloads.getAllKeys();
    request.addEventListener('success', () => {
      offlineStore.set({...get(offlineStore), cached: [...request.result]});
      resolve();
    });
    request.addEventListener('error', () => {
      console.log(request.error);
      resolve();
    });
  });
};

export const getOffline = async (id: IDBValidKey): Promise<Blob | null> => {
  return new Promise(async (resolve) => {
    const {db} = get(offlineStore);
    if (!db) {
      console.error('No IDBDatabase');
      return resolve(null);
    }
    const transaction = db.transaction(['downloads']);
    const request = transaction.objectStore('downloads').get(id);
    request.addEventListener('success', () => {
      resolve(request.result);
    });
    request.addEventListener('error', () => {
      console.log(request.error);
      resolve(null);
    });
  });
};

export const deleteOffline = async (id: IDBValidKey): Promise<void> => {
  return new Promise(async (resolve) => {
    const {db} = get(offlineStore);
    if (!db) {
      console.error('No IDBDatabase');
      return resolve();
    }
    const transaction = db.transaction(['downloads'], 'readwrite');
    const request = transaction.objectStore('downloads').delete(id);
    request.addEventListener('success', async () => {
      await updateStore();
      resolve();
    });
    request.addEventListener('error', () => {
      console.log(request.error);
      resolve();
    });
  });
};

export const addOffline = async ({id, url}: AddOffline): Promise<void> => {
  return new Promise(async (resolve) => {
    const offline = get(offlineStore);
    if (!offline.db) {
      console.error('No IDBDatabase');
      return resolve();
    }
    if (Object.keys(offline.downloads).includes(id)) {
      resolve();
      return;
    }
    const controller = new AbortController();
    try {
      const update = (length = 0, received = 0) => {
        const offline = get(offlineStore);
        offline.downloads[id] = {
          controller,
          length,
          received,
          progress: (100 / length) * received
        };
        offlineStore.set(offline);
      };
      const response = await fetch(url, {signal: controller.signal});
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error('No response body');
      }
      const reader = response.body.getReader();
      const type = response.headers.get('content-type') ?? '';
      const length = Number.parseInt(
        response.headers.get('content-length') ?? '0'
      );
      let received = 0;
      let chunks = [];
      update(length, received);
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          break;
        }
        received += value.length;
        chunks.push(value);
        update(length, received);
      }
      const blob = new Blob(chunks, {type});
      const transaction = offline.db.transaction(['downloads'], 'readwrite');
      const request = transaction.objectStore('downloads').put(blob, id);
      request.addEventListener('success', async () => {
        delete offline.downloads[id];
        await updateStore();
        resolve();
      });
      request.addEventListener('error', () => {
        throw new Error();
      });
    } catch (err) {
      controller.abort();
      delete offline.downloads[id];
      console.log(err);
      resolve();
    }
  });
};
