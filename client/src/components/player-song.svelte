<script lang="ts">
  import type {Song} from '$apiTypes';
  import {playerStore} from '$lib/stores';
  import Wifioff from '$components/icons/wifioff.svelte';

  export let isLoaded: boolean;
  export let isOffline: boolean;

  $: song = $playerStore as Song;
</script>

<p class="h6 lh-base m-0 me-auto">
  {#if !isLoaded}
    <span role="status" class="spinner-border spinner-border-sm me-1">
      <span class="visually-hidden">Loading…</span>
    </span>
  {/if}
  {#if isOffline}<Wifioff />{/if}
  <span>{song.name}</span>
</p>
<div class="d-flex flex-wrap">
  {#if song.artist}
    <a
      href={`/audiobooks/${song.artist_id}`}
      class="text-body-secondary fs-7 me-2"
    >
      {song.artist.name}
    </a>
  {/if}
  {#if song.album}
    <a
      href={`/audiobooks/${song.artist_id}/${song.album_id}`}
      class="text-body-secondary fs-7 me-2"
    >
      {song.album.name}
    </a>
  {/if}
</div>
