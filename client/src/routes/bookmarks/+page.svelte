<script lang="ts">
  import type {
    Bookmark,
    Song,
    Album,
    Artist,
    Episode,
    Podcast
  } from '$apiTypes';
  import type {PageData} from './$types';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {
    offlineStore,
    playStore,
    settingStore,
    removeBookmark,
    unplayedBookmark
  } from '$lib/stores';
  import {formatTime, progress} from '$lib/utils';
  import {addOffline, removeOffline} from '$lib/offline';
  import BookmarkX from '$components/icons/bookmark-x.svelte';
  import Backspace from '$components/icons/backspace.svelte';
  import Download from '$components/icons/download.svelte';
  import Trash from '$components/icons/trash.svelte';
  import Play from '$components/icons/play.svelte';

  export let data: PageData;

  $: bookmarks = [...data.bookmarks];

  const parentSong = (bookmark: Bookmark): Song => {
    return bookmark.parent as Song;
  };

  const parentAlbum = (bookmark: Bookmark): Album => {
    const parent = bookmark.parent as Song;
    return parent.album as Album;
  };

  const parentArtist = (bookmark: Bookmark): Artist => {
    const parent = bookmark.parent as Song;
    return parent.artist as Artist;
  };

  const parentEpisode = (bookmark: Bookmark): Episode => {
    return bookmark.parent as Episode;
  };

  const parentPodcast = (bookmark: Bookmark): Podcast => {
    return parentEpisode(bookmark).parent as Podcast;
  };

  const onSong = (bookmark: Bookmark) => {
    if (bookmark.parent_type === 'song') {
      playStore.set({id: bookmark.parent_id, type: 'song'});
    }
    if (bookmark.parent_type === 'episode') {
      playStore.set({id: bookmark.parent_id, type: 'episode'});
    }
  };

  const onRemove = async (bookmark: Bookmark) => {
    if (window.confirm('Remove bookmark?')) {
      removeBookmark({id: bookmark.id});
      removeOffline(bookmark.parent_id);
    }
  };

  const onUnplayed = async (bookmark: Bookmark) => {
    if (window.confirm('Mark as unplayed and remove bookmark?')) {
      removeBookmark({id: bookmark.id});
      unplayedBookmark({id: bookmark.id, parent_id: bookmark.parent_id});
      removeOffline(bookmark.parent_id);
    }
  };

  const onRemoveOffline = async (bookmark: Bookmark) => {
    removeOffline(bookmark.parent_id);
  };

  const onAddOffline = async (ev: MouseEvent, bookmark: Bookmark) => {
    const target = ev.target as HTMLElement;
    const button = target.closest('button');
    if (button) {
      button.disabled = true;
      button.blur();
    }
    const url = new URL(`/audio/${bookmark.parent_id}`, PUBLIC_API_URL);
    url.searchParams.set('type', bookmark.parent_type);
    addOffline({id: bookmark.parent_id, url});
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };
</script>

<h2 class="text-warning mb-3 fs-3">{data.heading}</h2>
<div class="list-group">
  {#if bookmarks.length === 0}
    <div class="list-group-item text-body-secondary">No bookmarks found</div>
  {:else}
    {#each bookmarks as item (item.id)}
      <article
        id="bookmark-{item.id}"
        class="list-group-item d-flex flex-wrap justify-content-between align-items-center"
      >
        <h3 class="mt-1 mb-0 h6 lh-base">
          {#if item.parent_type === 'song'}
            {parentSong(item).name}
          {/if}
          {#if item.parent_type === 'episode'}
            <img
              alt={parentPodcast(item).title}
              src={new URL(`/artwork/${parentPodcast(item).id}`, PUBLIC_API_URL)
                .href}
              class="d-inline-block align-top rounded overflow-hidden me-1"
              width="24"
              height="24"
              loading="lazy"
            />
            <span>{parentEpisode(item).title}</span>
          {/if}
        </h3>
        <div
          class="w-100 d-flex flex-wrap justify-content-between align-items-center"
        >
          <p class="mb-0 my-1 w-75 d-flex flex-wrap align-items-center">
            <span
              class="badge text-body-secondary bg-dark-subtle font-monospace me-2"
            >
              {formatTime(item.position / 1000)}
            </span>
            {#if item.parent_type === 'song'}
              <a
                href={`/audiobooks/${parentArtist(item).id}/${
                  parentAlbum(item).id
                }`}
                class="text-body-secondary fs-7"
              >
                {parentAlbum(item).name}
              </a>
            {/if}
            {#if item.parent_type === 'episode'}
              <a
                href={`/podcasts/${parentPodcast(item).id}`}
                class="text-body-secondary fs-7"
              >
                {parentPodcast(item).title}
              </a>
            {/if}
          </p>
          <div class="d-flex mt-2 mb-1">
            {#if $offlineStore.cached.includes(item.parent_id)}
              <button
                on:click={() => onRemoveOffline(item)}
                class="btn btn-sm btn-outline-secondary"
                aria-label="remove offline download"
                type="button"
              >
                <Trash />
              </button>
            {:else}
              <button
                on:click={(ev) => onAddOffline(ev, item)}
                disabled={$settingStore.offline ||
                  Object.keys($offlineStore.downloads).includes(item.parent_id)}
                class="btn btn-sm btn-outline-secondary"
                aria-label="download for offline play"
                type="button"
              >
                <Download />
              </button>
            {/if}
            <div
              class="ms-2 btn-group"
              aria-label="bookmark actions"
              role="group"
            >
              <button
                on:click={() => onUnplayed(item)}
                class="btn btn-sm btn-outline-danger"
                aria-label="mark as unplayed"
                type="button"
              >
                <Backspace />
              </button>
              <button
                on:click={() => onRemove(item)}
                class="btn btn-sm btn-outline-danger"
                aria-label="remove bookmark"
                type="button"
              >
                <BookmarkX />
              </button>
            </div>
            <button
              on:click={() => onSong(item)}
              class="btn ms-2 btn-sm btn-outline-success"
              aria-label="resume playback"
              type="button"
            >
              <Play />
            </button>
          </div>
        </div>
        {#if Object.keys($offlineStore.downloads).includes(item.parent_id)}
          <div class="progress w-100 my-2" style="height: 0.125rem;">
            <div
              class="progress-bar bg-info"
              role="progressbar"
              style="width: {$offlineStore.downloads[item.parent_id]
                .progress}%;"
              aria-valuenow={Math.round(
                $offlineStore.downloads[item.parent_id].progress
              )}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        {/if}
        <div class="progress w-100 my-2" style="height: 0.125rem;">
          <div
            class="progress-bar bg-success"
            role="progressbar"
            style="width: {progress(item)}%;"
            aria-valuenow={Math.round(progress(item))}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </article>
    {/each}
  {/if}
</div>

<div class="mt-4 d-flex justify-content-center gap-3">
  <p class="fs-7">
    <Backspace />
    <span class="ms-1">Unplayed + Remove</span>
  </p>
  <p class="fs-7">
    <BookmarkX />
    <span class="ms-1">Remove Bookmark</span>
  </p>
</div>

{#if $offlineStore.quota}
  <div class="mt-4 d-flex justify-content-center gap-3">
    <p class="fs-7">{formatBytes($offlineStore.usage)} / {formatBytes($offlineStore.quota)}</p>
  </div>
{/if}
