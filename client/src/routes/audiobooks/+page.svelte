<script lang="ts">
  import type {PageData} from './$types';
  import type {Artist, Song} from '$apiTypes';
  import {playerStore} from '$lib/stores';
  import Headphones from '$components/icons/headphones.svelte';

  export let data: PageData;

  const artists: Artist[] = data.artists;

  $: player = $playerStore as Song;

  const playing = (artist: Artist) => {
    return player && player.artist_id === artist.id;
  };
</script>

<h2>
  <a href="/audiobooks">{data.heading}</a>
</h2>
<div class="List">
  {#if artists.length === 0}
    <p class="p">No artists found</p>
  {:else}
    {#each artists as item (item.id)}
      <a href="/audiobooks/{item.id}" class="flex gap-xs jc-between ai-start">
        <span class="p" class:color-active={playing(item)}>
          {#if player && player.artist_id === item.id}
            <span class="inline-flex ai-center">
              <Headphones />
            </span>
          {/if}
          {item.name}
        </span>
        <span class="color-subtle small monospace">
          {item.album_count}
        </span>
      </a>
    {/each}
  {/if}
</div>
