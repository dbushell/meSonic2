<script lang="ts">
  import type {PageData} from './$types';
  import type {Artist, Album, Song} from '$apiTypes';
  import {playerStore} from '$lib/stores';
  import Headphones from '$components/icons/headphones.svelte';

  export let data: PageData;

  const artists: Artist[] = data.artists;
  const albums: Album[] = artists[0].albums ?? [];

  $: player = $playerStore as Song;

  const playing = (album: Album) => {
    return player && player.album_id === album.id;
  };
</script>

<h2>
  <a href="/audiobooks">{data.heading}</a>
</h2>
<div class="List">
  <a href="/audiobooks" class="flex gap-xs jc-between ai-start">
    <span class="p color-subtle">Return</span>
  </a>
  {#if artists.length === 0 || albums.length === 0}
    <p class="p">No albums found</p>
  {:else}
    {#each albums as item (item.id)}
      <a
        href="/audiobooks/{item.artist_id}/{item.id}"
        class="flex gap-xs jc-between ai-start"
      >
        <span class="p" class:color-active={playing(item)}>
          {#if player && player.album_id === item.id}
            <span class="inline-flex ai-center">
              <Headphones />
            </span>
          {/if}
          {item.name}
        </span>
        <span class="color-subtle small monospace">
          {item.song_count}
        </span>
      </a>
    {/each}
  {/if}
</div>
