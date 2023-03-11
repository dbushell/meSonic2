<script lang="ts">
  import type {LayoutData} from './$types';
  import type {Song, Episode} from '$apiTypes';
  import {PUBLIC_APP_URL} from '$env/static/public';
  import {page} from '$app/stores';
  import {playStore, playerStore} from '$lib/stores';
  import Player from '../components/player.svelte';
  import Header from '../components/header.svelte';
  import Footer from '../components/footer.svelte';

  export let data: LayoutData;

  const url = new URL(data.canonical, PUBLIC_APP_URL);

  $: play = $playStore;
  $: player = $playerStore;

  let title: string;
  $: {
    title = data.app;
    if (player && play?.type === 'song') {
      let song = player as Song;
      if (song.album) {
        title = `${title} - ${song.album.name}`;
      }
      title = `${title} - ${song.name}`;
    } else if (player && play?.type === 'episode') {
      let episode = player as Episode;
      if (episode.parent) {
        title = `${title} - ${episode.parent.title}`;
      }
      title = `${title} - ${episode.title}`;
    } else if ($page.data.heading) {
      title = `${title} - ${$page.data.heading}`;
    }
  }

  let isMedia: boolean;
  let isPodcasts: boolean;
  let isBookmarks: boolean;
  let isSettings: boolean;

  $: {
    isMedia = /^\/audiobooks|albums/.test($page.url.pathname);
    isBookmarks = /^\/bookmarks/.test($page.url.pathname);
    isSettings = /^\/settings/.test($page.url.pathname);
    isPodcasts = !(isMedia || isBookmarks || isSettings);
  }
</script>

<svelte:head>
  <title>{title}</title>
  <link rel="canonical" href={url.href} />
</svelte:head>
<Header app={data.app} {isMedia} {isPodcasts} {isBookmarks} {isSettings} />
<Player />
<main class="container-fluid mb-5">
  <slot />
</main>
<Footer app={data.app} />
