<script lang="ts">
  import type {Song} from '$apiTypes';
  import {playerStore} from '$lib/stores';
  import Wifioff from '$components/icons/wifioff.svelte';
  import Floppy from '$components/icons/floppy.svelte';

  export let isLoaded: boolean;
  export let isOffline: boolean;
  export let isDownload: boolean;

  $: song = $playerStore as Song;
</script>

<p class="mb-0">
  {#if !isLoaded}
    <span class="hidden">Loading…</span>
  {/if}
  {#if isOffline}
    <span class="inline-flex ai-center">
      <Wifioff /></span
    >{:else if isDownload}<span class="inline-flex ai-center"><Floppy /></span
    >{/if}
  <span>{song.name}</span>
</p>
<div class="small flex flex-wrap gap-xs">
  {#if song.artist}
    <a href={`/audiobooks/${song.artist_id}`}>
      {song.artist.name}
    </a>
  {/if}
  {#if song.album}
    <a href={`/audiobooks/${song.artist_id}/${song.album_id}`}>
      {song.album.name}
    </a>
  {/if}
</div>
