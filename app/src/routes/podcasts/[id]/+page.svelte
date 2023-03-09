<script lang="ts">
  import type {Episode} from '$apiTypes';
  import type {PageData} from './$types';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {playStore, playerStore} from '$lib/stores';
  import {formatDate, formatTime, progress} from '$lib/utils';
  import Headphones from '$components/icons/headphones.svelte';
  import Lightning from '$components/icons/lightning.svelte';
  import Check from '$components/icons/check.svelte';

  export let data: PageData;

  $: podcasts = data.podcasts;
  $: episodes = podcasts.length ? podcasts[0].episodes ?? [] : [];

  $: song = $playerStore;

  const onSong = (episode: Episode) => {
    playStore.set(episode.id);
  };

  const cached = (episode: Episode) => {
    return episode?.metadata?.find((meta) => meta.key === 'cached');
  };

  const playing = (episode: Episode) => {
    return song && song.id === episode.id;
  };

  const played = (episode: Episode) => {
    return episode?.metadata?.find((meta) => meta.key === 'played');
  };

  const iconed = (episode: Episode) => {
    return cached(episode) || playing(episode) || played(episode);
  };

  const className = (episode: Episode) => {
    if (song && song.id === episode.id) {
      return 'text-primary';
    } else if (played(episode)) {
      return 'text-success';
    }
    return 'text-body-emphasis';
  };
</script>

<h2 class="mb-3 fs-3">
  <a href="/podcasts" class="text-warning text-decoration-none"
    >{data.mainHeading}</a
  >
</h2>
<div class="list-group">
  {#if episodes.length === 0}
    <div class="list-group-item bg-light-subtle text-body-secondary">
      No episodes found
    </div>
  {:else}
    {#each episodes as item (item.id)}
      <button
        on:click={() => onSong(item)}
        type="button"
        class="list-group-item list-group-item-action px-2 {className(item)}"
      >
        <div class="d-flex">
          <img
            alt={podcasts[0].title}
            src={new URL(`/artwork/${podcasts[0].id}`, PUBLIC_API_URL).href}
            class="rounded overflow-hidden flex-shrink-0 me-2"
            width="40"
            height="40"
            loading="lazy"
          />
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
              <span class="lh-sm">
                {#if iconed(item)}
                  <span class="align-middle d-inline-flex align-items-center">
                    {#if cached(item)}
                      <Lightning />
                    {/if}
                    {#if playing(item)}
                      <Headphones />
                    {:else if played(item)}
                      <Check />
                    {/if}
                  </span>
                {/if}
                <span>{item.title}</span>
              </span>
              {#if item.duration}
                <span
                  class="badge text-body-secondary bg-dark-subtle font-monospace ms-1"
                >
                  {formatTime(item.duration)}
                </span>
              {/if}
            </div>
            <time class="fs-7 text-body-secondary" datetime={item.modified_at}>
              {formatDate(new Date(item.modified_at))}
            </time>
          </div>
        </div>
        {#if item?.bookmarks?.length}
          <div class="progress w-100 mt-2 mb-1" style="height: 0.125rem;">
            <div
              class="progress-bar bg-success"
              role="progressbar"
              style="width: {progress(item.bookmarks[0], item)}%;"
              aria-valuenow={Math.round(progress(item.bookmarks[0], item))}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        {/if}
      </button>
    {/each}
  {/if}
</div>
