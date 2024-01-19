<script lang="ts">
  import type {Episode} from '$apiTypes';
  import {playerStore} from '$lib/stores';
  import {PUBLIC_API_URL} from '$env/static/public';
  import Wifioff from '$components/icons/wifioff.svelte';
  import Floppy from '$components/icons/floppy.svelte';

  export let isLoaded: boolean;
  export let isOffline: boolean;
  export let isDownload: boolean;

  $: episode = $playerStore as Episode;
</script>

<p class="mb-0">
  <span class="inline-flex ai-center va-middle">
    <img
      alt={episode.title}
      src={new URL(`/artwork/${episode.parent_id}`, PUBLIC_API_URL).href}
      class="d-inline-block"
      width="24"
      height="24"
      loading="lazy"
    />
  </span>
  {#if !isLoaded}
    <span class="hidden">Loading…</span>
  {/if}
  {#if isOffline}
    <span class="inline-flex ai-center">
      <Wifioff /></span
    >{:else if isDownload}<span class="inline-flex ai-center"><Floppy /></span
    >{/if}
  <span>{episode.title}</span>
</p>
{#if episode.parent}
  <div class="small flex flex-wrap gap-xs">
    <a href={`/podcasts/${episode.parent_id}`}>
      {episode.parent.title}
    </a>
  </div>
{/if}
