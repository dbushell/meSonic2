import {browser} from '$app/environment';
import {invalidate} from '$app/navigation';
import {get, writable, derived} from 'svelte/store';
import type {Writable, Readable} from 'svelte/store';
import type {SettingStore, OfflineStore} from '$lib/types';
import type {Episode, AddBookmark, RemoveBookmark} from '$apiTypes';
import {loadIndexedDB} from './offline';
import {PUBLIC_API_URL} from '$env/static/public';

export const offlineStore: Writable<OfflineStore> = writable({
  db: null,
  cached: [],
  downloads: {}
});

if (browser) {
  loadIndexedDB();
}

export const playStore: Writable<string> = writable<string>('');

export const playerStore: Readable<Episode | undefined> = derived(
  [playStore],
  ([$playStore], set) => {
    if (!$playStore) {
      set(undefined);
      return;
    }
    const url = new URL(`/api/episode/${$playStore}`, PUBLIC_API_URL);
    url.searchParams.set('bookmarks', 'true');
    url.searchParams.set('podcasts', 'true');
    url.searchParams.set('metadata', 'true');
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const episodes = (await response.json()) as Episode[];
        if (episodes.length) {
          set(episodes[0]);
        } else {
          set(undefined);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
);

const defaultSetting: SettingStore = {rate: '1.0', offline: false};
let initialSetting: SettingStore = defaultSetting;

if (browser) {
  try {
    initialSetting = JSON.parse(
      globalThis.localStorage.getItem('setting')!
    ) as SettingStore;
    for (const key of Object.keys(defaultSetting)) {
      if (!Object.hasOwn(initialSetting, key)) {
        initialSetting[key] = defaultSetting[key];
      }
    }
  } catch {
    initialSetting = defaultSetting;
  }
}

export const settingStore = writable<SettingStore>(initialSetting);

settingStore.subscribe((setting) => {
  if (browser) {
    globalThis.localStorage.setItem('setting', JSON.stringify(setting));
  }
});

export const addBookmark = async (data: AddBookmark): Promise<void> => {
  const url = new URL(`/api/bookmark/add`, PUBLIC_API_URL);
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    }
  });
  if (response.ok) {
    invalidate((url) => {
      if (url.pathname.startsWith(`/api/bookmark/all`)) {
        return true;
      }
      const episode = get(playerStore);
      if (
        episode &&
        url.pathname.startsWith(`/api/podcast/${episode.parent_id}`)
      ) {
        return true;
      }
      return false;
    });
  } else {
    console.log(response);
  }
};

export const removeBookmark = async (data: RemoveBookmark): Promise<void> => {
  const url = new URL(`/api/bookmark/remove`, PUBLIC_API_URL);
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    }
  });
  if (response.ok) {
    invalidate((url) => {
      return url.pathname.startsWith('/api/bookmark/all');
    });
  } else {
    console.log(response);
  }
};
