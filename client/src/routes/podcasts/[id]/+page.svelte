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

  $: player = $playerStore;

  const onSong = (episode: Episode) => {
    playStore.set({id: episode.id, type: 'episode'});
  };

  const cached = (episode: Episode) => {
    return episode?.metadata?.find((meta) => meta.key === 'cached');
  };

  const playing = (episode: Episode) => {
    return player && player.id === episode.id;
  };

  const played = (episode: Episode) => {
    return episode?.metadata?.find((meta) => meta.key === 'played');
  };

  const iconed = (episode: Episode) => {
    return cached(episode) || playing(episode) || played(episode);
  };
</script>

<h2>
  <a href="/podcasts">{data.mainHeading}</a>
</h2>
<div class="List">
  {#if episodes.length === 0}
    <p>No episodes found</p>
  {:else}
    {#each episodes as item (item.id)}
      <button on:click={() => onSong(item)} type="button" class="Stack gap-xs">
        <div class="flex gap-xs ai-center">
          <img
            alt={podcasts[0].title}
            src={new URL(`/artwork/${podcasts[0].id}`, PUBLIC_API_URL).href}
            class="flex-shrink-0"
            width="40"
            height="40"
            loading="lazy"
          />
          <div class="flex-grow-1">
            <div class="flex jc-between ai-start">
              <span
                class="p"
                class:color-success={played(item)}
                class:color-active={playing(item)}
              >
                {#if iconed(item)}
                  <span class="inline-flex ai-center">
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
                <span class="color-subtle small monospace">
                  {formatTime(item.duration)}
                </span>
              {/if}
            </div>
            <time class="color-subtle small" datetime={item.modified_at}>
              {formatDate(new Date(item.modified_at))}
            </time>
          </div>
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
