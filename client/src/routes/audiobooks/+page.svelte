<script lang="ts">
  import type {PageData} from './$types';
  import type {Artist} from '$apiTypes';
  import {playerStore} from '$lib/stores';
  import Headphones from '$components/icons/headphones.svelte';

  export let data: PageData;

  const artists: Artist[] = data.artists;

  $: player = $playerStore;

  const className = (artist: Artist) => {
    if (player && player.artist_id === artist.id) {
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
  {#if artists.length === 0}
    <div class="list-group-item text-danger">No artists found</div>
  {:else}
    {#each artists as item (item.id)}
      <a
        href="/audiobooks/{item.id}"
        class="list-group-item list-group-item-action d-flex justify-content-between align-items-start pe-2 {className(
          item
        )}"
      >
        <span class="lh-sm">
          {#if player && player.artist_id === item.id}
            <Headphones />
          {/if}
          {item.name}
        </span>
        <span
          class="badge text-body-secondary bg-dark-subtle font-monospace ms-1"
        >
          {item.album_count}
        </span>
      </a>
    {/each}
  {/if}
</div>
