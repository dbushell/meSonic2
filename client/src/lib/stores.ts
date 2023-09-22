import {browser} from '$app/environment';
import {invalidate} from '$app/navigation';
import {get, writable, derived} from 'svelte/store';
import type {Writable, Readable} from 'svelte/store';
import type {PlayStore, SettingStore, OfflineStore} from '$lib/types';
import type {
  Song,
  Album,
  Episode,
  AddBookmark,
  RemoveBookmark,
  UnplayedBookmark
} from '$apiTypes';
import {initStore} from '$lib/offline';
import {PUBLIC_API_URL} from '$env/static/public';

export const offlineStore: Writable<OfflineStore> = writable({
  cached: [],
  downloads: {},
  quota: 0,
  usage: 0
});

if (browser) {
  initStore();
}

export const playStore: Writable<PlayStore | undefined> = writable<
  PlayStore | undefined
>();

export const playerStore: Readable<Song | Episode | undefined> = derived(
  [playStore],
  ([$playStore], set) => {
    if (!$playStore) {
      set(undefined);
      return;
    }
    let url: URL | undefined = undefined;
    if ($playStore.type === 'song') {
      url = new URL(`/api/song/${$playStore.id}`, PUBLIC_API_URL);
      url.searchParams.set('bookmarks', 'true');
      url.searchParams.set('artists', 'true');
      url.searchParams.set('albums', 'true');
    }
    if ($playStore.type === 'episode') {
      url = new URL(`/api/episode/${$playStore.id}`, PUBLIC_API_URL);
      url.searchParams.set('bookmarks', 'true');
      url.searchParams.set('podcasts', 'true');
      url.searchParams.set('metadata', 'true');
    }
    if (!url) {
      set(undefined);
      return;
    }
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const results = (await response.json()) as Song[] | Episode[];
        if (results.length) {
          set(results[0]);
        } else {
          throw new Error('No results');
        }
      })
      .catch((err) => {
        set(undefined);
        console.debug(err);
      });
  }
);

export const nextStore: Readable<PlayStore | undefined> = derived(
  [playStore, playerStore],
  ([$playStore, $playerStore], set) => {
    if (
      !$playStore ||
      !$playerStore ||
      $playStore.id !== $playerStore.id ||
      $playStore.type !== 'song'
    ) {
      set(undefined);
      return;
    }
    const song = $playerStore as Song;
    const url = new URL(`/api/album/${song.album_id}`, PUBLIC_API_URL);
    url.searchParams.set('songs', 'true');
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const albums = (await response.json()) as Album[];
        const songs = albums[0].songs ?? [];
        for (let i = 0; i < songs.length - 1; i++) {
          if (songs[i].id === $playStore.id) {
            set({id: songs[i + 1].id, type: 'song'});
            return;
          }
        }
        throw new Error('No next song found');
      })
      .catch((err) => {
        set(undefined);
        console.debug(err);
      });
  }
);

const defaultSetting: SettingStore = {
  offline: false,
  rate: '1.0',
  skip: 15
} as const;

let initialSetting: SettingStore = {...defaultSetting};

if (browser) {
  try {
    initialSetting = JSON.parse(globalThis.localStorage.getItem('setting')!);
    for (const key of Object.keys(defaultSetting) as Array<
      keyof SettingStore
    >) {
      if (!Object.hasOwn(initialSetting, key)) {
        Object.assign(initialSetting, {[key]: defaultSetting[key]});
      }
    }
  } catch {
    initialSetting = {...defaultSetting};
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
    invalidate(invalidateBookmark);
  } else {
    console.debug(response);
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
    invalidate(invalidateBookmark);
  } else {
    console.debug(response);
  }
};

export const unplayedBookmark = async (
  data: UnplayedBookmark
): Promise<void> => {
  const url = new URL(`/api/bookmark/unplayed`, PUBLIC_API_URL);
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    }
  });
  if (response.ok) {
    invalidate(invalidateBookmark);
  } else {
    console.debug(response);
  }
};

const invalidateBookmark = (url: URL): boolean => {
  if (url.pathname.startsWith(`/api/bookmark/all`)) {
    return true;
  }
  const play = get(playStore);
  const player = get(playerStore);
  if (!play || !player) return false;
  if (play.type === 'song') {
    const song = player as Song;
    if (url.pathname.startsWith(`/api/album/${song.album_id}`)) {
      return true;
    }
    if (url.pathname.startsWith(`/api/artist/${song.artist_id}`)) {
      return true;
    }
  }
  if (play.type === 'episode') {
    const episode = player as Episode;
    if (url.pathname.startsWith(`/api/podcast/${episode.parent_id}`)) {
      return true;
    }
  }
  return false;
};

const createImage = async (
  size: number,
  image: HTMLImageElement
): Promise<[string, string] | null> => {
  const uid = `artwork-${size}-${size}`;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(localStorage.getItem(uid) ?? '');
      if (!blob) {
        return resolve(null);
      }
      const url = URL.createObjectURL(blob);
      localStorage.setItem(uid, url);
      resolve([url, blob.type]);
    });
  });
};

const updateMetadata = async (
  title: string,
  artist: string,
  image: HTMLImageElement
) => {
  const images = {
    '96': await createImage(96, image),
    '256': await createImage(256, image),
    '512': await createImage(512, image)
  };
  const artwork: MediaImage[] = [];
  for (const [size, image] of Object.entries(images)) {
    if (!image) continue;
    artwork.push({
      src: image[0],
      type: image[1],
      sizes: `${size}x${size}`
    });
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    artwork
  });
};

if (browser) {
  playerStore.subscribe((player) => {
    const type = get(playStore)?.type;
    if (!type || !player) {
      navigator.mediaSession.metadata = null;
      return;
    }
    let title: string | undefined = undefined;
    let artist: string | undefined = undefined;
    let artwork: MediaImage[] = [];
    const image = new Image();
    if (type === 'song') {
      const song = player as Song;
      title = song.name;
      artist = `${song.album?.name} - ${song.artist?.name}`;
      image.src = new URL(`/512x512.avif`, PUBLIC_API_URL).href;
    }
    if (type === 'episode') {
      const episode = player as Episode;
      title = episode.title;
      artist = episode.parent?.title;
      image.src = new URL(`/artwork/${episode.parent_id}`, PUBLIC_API_URL).href;
    }
    image.addEventListener('load', async () => {
      updateMetadata(title!, artist!, image);
    });
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist
    });
  });
}
