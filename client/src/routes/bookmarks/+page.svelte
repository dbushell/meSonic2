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
    removeBookmark
  } from '$lib/stores';
  import {formatTime, progress} from '$lib/utils';
  import {addOffline, deleteOffline} from '$lib/offline';
  import Download from '$components/icons/download.svelte';
  import Trash from '$components/icons/trash.svelte';

  export let data: PageData;

  $: bookmarks = [...data.bookmarks];

  const parentSong = (bookmark: Bookmark): Song => {
    return bookmark.parent as Song;
  };

  const parentAlbum = (bookmark: Bookmark): Album => {
    return bookmark.parent!.album as Album;
  };

  const parentArtist = (bookmark: Bookmark): Artist => {
    return bookmark.parent!.artist as Artist;
  };

  const parentEpisode = (bookmark: Bookmark): Episode => {
    return bookmark.parent as Episode;
  };

  const parentPodcast = (bookmark: Bookmark): Podcast => {
    return bookmark.parent!.parent as Podcast;
  };

  const onSong = (bookmark: Bookmark) => {
    if (bookmark.parent_type === 'song') {
      playStore.set({id: bookmark.parent_id, type: 'song'});
    }
    if (bookmark.parent_type === 'episode') {
      playStore.set({id: bookmark.parent_id, type: 'episode'});
    }
  };

  const onDelete = async (bookmark: Bookmark) => {
    if (window.confirm('Delete bookmark?')) {
      removeBookmark({id: bookmark.id});
      deleteOffline(bookmark.parent_id);
    }
  };

  const onDeleteOffline = async (bookmark: Bookmark) => {
    deleteOffline(bookmark.parent_id);
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
</script>

<h2 class="text-warning mb-3 fs-3">{data.heading}</h2>
<div class="list-group">
  {#if bookmarks.length === 0}
    <div class="list-group-item bg-light-subtle text-body-secondary">
      No bookmarks found
    </div>
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
                on:click={() => onDeleteOffline(item)}
                class="btn me-2 btn-sm btn-outline-secondary"
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
                class="btn me-2 btn-sm btn-outline-secondary"
                aria-label="download for offline play"
                type="button"
              >
                <Download />
              </button>
            {/if}
            <button
              on:click={() => onSong(item)}
              class="btn me-2 btn-sm btn-outline-success"
              type="button"
            >
              Resume
            </button>
            <button
              on:click={() => onDelete(item)}
              class="btn btn-sm btn-outline-danger"
              type="button"
            >
              Delete
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
