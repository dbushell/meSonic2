<script lang="ts">
  import type {PageData} from './$types';
  import type {Podcast} from '$apiTypes';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {playerStore} from '$lib/stores';
  import {formatDate} from '$lib/utils';
  import Headphones from '$components/icons/headphones.svelte';
  import Settings from '$components/icons/settings.svelte';

  export let data: PageData;

  const podcasts: Podcast[] = data.podcasts;

  $: song = $playerStore;

  const className = (podcast: Podcast) => {
    if (song && song.parent_id === podcast.id) {
      return 'text-primary';
    }
    return 'text-body-emphasis';
  };
</script>

<h2 class="mb-3 fs-3 d-flex justify-content-between align-items-baseline">
  <a href="/podcasts" class="text-warning text-decoration-none"
    >{data.heading}</a
  >
  <a href="/podcasts/settings" class="fs-6 text-body-emphasis text-decoration-none me-3"
    >
    <span class="fw-light me-2 text-body-secondary">settings</span>
    <Settings />
  </a>
</h2>
<div class="list-group">
  {#if podcasts.length === 0}
    <div class="list-group-item">
      <a href="/podcasts/settings">No podcast feeds add one in settings</a>
    </div>
  {:else}
    {#each podcasts as item (item.id)}
      <a
        href="/podcasts/{item.id}"
        class="list-group-item list-group-item-action px-2 d-flex {className(
          item
        )}"
      >
        <img
          alt={item.title}
          src={new URL(`/artwork/${item.id}`, PUBLIC_API_URL).href}
          class="rounded overflow-hidden flex-shrink-0 me-2"
          width="40"
          height="40"
          loading="lazy"
        />
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start">
            <span class="lh-sm">
              {#if song && song.parent_id === item.id}
                <Headphones />
              {/if}
              {item.title}
            </span>
            <span
              class="badge text-body-secondary bg-dark-subtle font-monospace ms-1"
            >
              {item.episode_count}
            </span>
          </div>
          <time class="fs-7 text-body-secondary" datetime={item.modified_at}>
            {formatDate(new Date(item.modified_at))}
          </time>
        </div>
      </a>
    {/each}
  {/if}
</div>
