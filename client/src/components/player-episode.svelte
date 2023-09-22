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

<p class="h6 lh-base m-0 me-auto">
  <img
    alt={episode.title}
    src={new URL(`/artwork/${episode.parent_id}`, PUBLIC_API_URL).href}
    class="d-inline-block align-top rounded overflow-hidden me-1"
    width="24"
    height="24"
    loading="lazy"
  />
  {#if !isLoaded}
    <span role="status" class="spinner-border spinner-border-sm me-1">
      <span class="visually-hidden">Loading…</span>
    </span>
  {/if}
  {#if isOffline}<Wifioff />{:else if isDownload}<Floppy />{/if}
  <span>{episode.title}</span>
</p>
{#if episode.parent}
  <div class="d-flex flex-wrap">
    <a
      href={`/podcasts/${episode.parent_id}`}
      class="text-body-secondary fs-7 me-2"
    >
      {episode.parent.title}
    </a>
  </div>
{/if}
