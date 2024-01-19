<script lang="ts">
  import type {PageData} from './$types';
  import type {Episode, Podcast} from '$apiTypes';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {playerStore} from '$lib/stores';
  import {formatDate} from '$lib/utils';
  import Headphones from '$components/icons/headphones.svelte';
  import Settings from '$components/icons/settings.svelte';

  export let data: PageData;

  const podcasts: Podcast[] = data.podcasts;

  $: episode = $playerStore as Episode;

  const playing = (podcast: Podcast) => {
    return episode && episode.parent_id === podcast.id;
  };
</script>

<h2 class="flex jc-between ai-baseline">
  <a href="/podcasts">{data.heading}</a>
  <a class="p flex gap-xs ai-center" href="/podcasts/settings">
    <span>settings</span>
    <Settings />
  </a>
</h2>
<div class="List">
  {#if podcasts.length === 0}
    <a class="p" href="/podcasts/settings">
      <span>No podcast feeds add one in settings</span>
    </a>
  {:else}
    {#each podcasts as item (item.id)}
      <a href="/podcasts/{item.id}" class="flex gap-xs ai-center">
        <img
          alt={item.title}
          src={new URL(`/artwork/${item.id}`, PUBLIC_API_URL).href}
          class="flex-shrink-0"
          width="40"
          height="40"
          loading="lazy"
        />
        <div class="flex-grow-1">
          <div class="flex jc-between ai-start">
            <span class="p" class:color-active={playing(item)}>
              {#if episode && episode.parent_id === item.id}
                <span class="inline-flex ai-center">
                  <Headphones />
                </span>
              {/if}
              {item.title}
            </span>
            <span class="color-subtle small monospace">
              {item.episode_count}
            </span>
          </div>
          <time class="color-subtle small" datetime={item.modified_at}>
            {formatDate(new Date(item.modified_at))}
          </time>
        </div>
      </a>
    {/each}
  {/if}
</div>
