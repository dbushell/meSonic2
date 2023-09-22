import {get} from 'svelte/store';
import {offlineStore} from '$lib/stores';
import type {AddOffline} from '$lib/types';

// https://vitejs.dev/guide/features.html#import-with-query-suffixes
import workerURL from '$workers/offline.ts?worker&url';

let worker: Worker;

export const initStore = async (): Promise<void> => {
  worker = new Worker(workerURL, {
    type: 'module'
  });

  worker.addEventListener('message', (ev) => {
    const {id, type} = ev.data;
    if (type === 'abort') {
      removeOffline(id);
      return;
    }
    if (type === 'progress') {
      const offline = get(offlineStore);
      const {contentLength, contentSize} = ev.data;
      offline.downloads[id] = {
        contentLength,
        contentSize,
        progress: (100 / contentLength) * contentSize
      };
      offlineStore.set(offline);
      return;
    }
    if (type === 'done') {
      const {contentType, contentSize} = ev.data;
      // clear progress
      const offline = get(offlineStore);
      delete offline.downloads[id];
      offlineStore.set(offline);
      // save metadata if successful
      if (contentType && contentSize) {
        localStorage.setItem(
          id,
          JSON.stringify({
            contentType,
            contentSize
          })
        );
      }
      updateStore();
      return;
    }
  });

  await updateStore();
};

const updateStore = async (): Promise<void> => {
  try {
    const root = await navigator.storage.getDirectory();
    const cached = [];
    for await (const [key] of root.entries()) {
      cached.push(key);
    }
    offlineStore.set({...get(offlineStore), cached});

    navigator.storage.estimate().then(({quota, usage}) => {
      offlineStore.set({
        ...get(offlineStore),
        quota: quota ?? 0,
        usage: usage ?? 0
      });
    });
  } catch (err) {
    console.error(err);
  }
};

export const getOffline = async (id: string): Promise<Blob | null> => {
  try {
    const meta = JSON.parse(localStorage.getItem(id) ?? '{}');
    if (!meta.contentType) {
      throw new Error(`No metadata (${id})`);
    }
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(id);
    const file = await handle.getFile();
    return new Blob([file], {type: meta.contentType});
  } catch (err) {
    console.error(err);
    removeOffline(id);
  } finally {
    await updateStore();
  }
  return null;
};

export const removeOffline = async (id: string): Promise<void> => {
  try {
    localStorage.removeItem(id);
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(id);
  } catch (err) {
    console.error(err);
  } finally {
    await updateStore();
  }
};

export const addOffline = async ({id, url}: AddOffline): Promise<void> => {
  worker.postMessage({type: 'download', id, url: url.href});
};
