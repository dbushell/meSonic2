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
</script>

<h2>
  <a href="/audiobooks">{data.heading}</a>
</h2>
<div class="List">
  {#if albums.length === 0 || songs.length === 0}
    <p class="p">No songs found</p>
  {:else}
    <a
      href="/audiobooks/{albums[0].artist_id}"
      class="flex gap-xs jc-between ai-start"
    >
      <span class="p color-subtle">Return</span>
    </a>
    {#each songs as item (item.id)}
      <button on:click={() => onSong(item)} type="button" class="Stack gap-xs">
        <div class="flex gap-xs jc-between ai-start">
          <span class="p" class:color-active={playing(item)}>
            {#if playing(item)}
              <span class="inline-flex ai-center">
                <Headphones />
              </span>
            {/if}
            {item.name}
          </span>
          <span class="color-subtle small monospace">
            {formatTime(item.duration)}
          </span>
        </div>
        {#if item?.bookmarks?.length}
          <progress
            class="Progress"
            value={Math.round(progress(item.bookmarks[0], item.duration))}
            max="100"
          ></progress>
        {/if}
      </button>
    {/each}
  {/if}
</div>
