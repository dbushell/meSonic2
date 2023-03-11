<script lang="ts">
  import type {PageData} from './$types';
  import type {Song} from '$apiTypes';
  import {playStore, playerStore} from '$lib/stores';
  import {formatTime, progress} from '$lib/utils';
  import Headphones from '$components/icons/headphones.svelte';

  export let data: PageData;

  $: albums = data.albums;
  $: songs = albums[0].songs ?? [];

  $: player = $playerStore;

  const onSong = (song: Song) => {
    playStore.set({id: song.id, type: 'song'});
  };

  const playing = (song: Song) => {
    return player && player.id === song.id;
  };

  const className = (song: Song) => {
    if (player && player.id === song.id) {
      return 'text-primary';
    }
    return 'text-body-emphasis';
  };
</script>

<h2 class="mb-3 fs-3">
  <a href="/audiobooks" class="text-warning text-decoration-none"
    >{data.heading}</a
  >
</h2>
<div class="list-group">
  {#if albums.length === 0 || songs.length === 0}
    <div class="list-group-item text-danger">No songs found</div>
  {:else}
    <a
      href="/audiobooks/{albums[0].artist_id}"
      class="list-group-item list-group-item-action d-flex justify-content-between align-items-start pe-2"
    >
      <span class="lh-sm text-body-secondary">Return</span>
    </a>
    {#each songs as item (item.id)}
      <button
        on:click={() => onSong(item)}
        type="button"
        class="list-group-item list-group-item-action px-2 {className(item)}"
      >
        <div class="d-flex justify-content-between align-items-start">
          <span class="lh-sm">
            {#if playing(item)}
              <Headphones />
            {/if}
            {item.name}
          </span>
          <span
            class="badge text-body-secondary bg-dark-subtle font-monospace ms-1"
          >
            {formatTime(item.duration)}
          </span>
        </div>
        {#if item?.bookmarks?.length}
          <div class="progress w-100 mt-2 mb-1" style="height: 0.125rem;">
            <div
              class="progress-bar bg-success"
              role="progressbar"
              style="width: {progress(item.bookmarks[0], item.duration)}%;"
              aria-valuenow={Math.round(
                progress(item.bookmarks[0], item.duration)
              )}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        {/if}
      </button>
    {/each}
  {/if}
</div>
