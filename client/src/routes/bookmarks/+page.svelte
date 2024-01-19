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
  import Button from '$components/button.svelte';
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

<h2>{data.heading}</h2>
<div class="List">
  {#if bookmarks.length === 0}
    <p class="p">No bookmarks found</p>
  {:else}
    {#each bookmarks as item (item.id)}
      <article id="bookmark-{item.id}" class="Stack gap-xs">
        <h3 class="p">
          {#if item.parent_type === 'song'}
            {parentSong(item).name}
          {/if}
          {#if item.parent_type === 'episode'}
            <div class="inline-flex ai-center va-middle">
              <img
                alt={parentPodcast(item).title}
                src={new URL(
                  `/artwork/${parentPodcast(item).id}`,
                  PUBLIC_API_URL
                ).href}
                class="flex-shrink-0"
                width="24"
                height="24"
                loading="lazy"
              />
            </div>
            <span>{parentEpisode(item).title}</span>
          {/if}
        </h3>
        <div class="flex flex-wrap jc-between gap-xs ai-center">
          <div class="small flex flex-wrap gap-xs ai-baseline">
            <span class="monospace color-subtle">
              {formatTime(item.position / 1000)}
            </span>
            {#if item.parent_type === 'song'}
              <a
                href={`/audiobooks/${parentArtist(item).id}/${
                  parentAlbum(item).id
                }`}
              >
                {parentAlbum(item).name}
              </a>
            {/if}
            {#if item.parent_type === 'episode'}
              <a href={`/podcasts/${parentPodcast(item).id}`}>
                {parentPodcast(item).title}
              </a>
            {/if}
          </div>
          <div class="flex flex-wrap gap-2xs ai-center">
            {#if $offlineStore.cached.includes(item.parent_id)}
              <Button
                icon
                small
                type="button"
                label="remove offline download"
                on:click={() => onRemoveOffline(item)}
              >
                <Trash slot="icon" />
              </Button>
            {:else}
              <Button
                icon
                small
                type="button"
                label="download for offline play"
                disabled={$settingStore.offline ||
                  Object.keys($offlineStore.downloads).includes(item.parent_id)}
                on:click={(ev) => onAddOffline(ev, item)}
              >
                <Download slot="icon" />
              </Button>
            {/if}
            <div class="Button-group mb-0">
              <Button
                icon
                small
                type="button"
                label="mark as unplayed"
                classes={['Button--warn']}
                on:click={() => onUnplayed(item)}
              >
                <Backspace slot="icon" />
              </Button>
              <Button
                icon
                small
                type="button"
                label="remove bookmark"
                classes={['Button--warn']}
                on:click={() => onRemove(item)}
              >
                <BookmarkX slot="icon" />
              </Button>
            </div>
            <Button
              icon
              small
              type="button"
              label="resume playback"
              on:click={() => onSong(item)}
            >
              <Play slot="icon" />
            </Button>
          </div>
        </div>
        {#if Object.keys($offlineStore.downloads).includes(item.parent_id)}
          <progress
            class="Progress"
            value={Math.round($offlineStore.downloads[item.parent_id].progress)}
            max="100"
          ></progress>
        {/if}
        <progress class="Progress" value={Math.round(progress(item))} max="100"
        ></progress>
      </article>
    {/each}
  {/if}
</div>

<div class="flex ai-center jc-center gap-s">
  <div class="small flex ai-center gap-2xs">
    <span class="inline-flex ai-center">
      <Backspace />
    </span>
    <span>Unplayed + Remove</span>
  </div>
  <div class="small flex ai-center gap-2xs">
    <span class="inline-flex ai-center">
      <BookmarkX />
    </span>
    <span>Remove Bookmark</span>
  </div>
</div>

{#if $offlineStore.quota}
  <div class="flex ai-center jc-center gap-s">
    <div class="small color-subtle">
      {formatBytes($offlineStore.usage)} / {formatBytes($offlineStore.quota)}
    </div>
  </div>
{/if}
