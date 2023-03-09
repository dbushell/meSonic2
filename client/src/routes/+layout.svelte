<script lang="ts">
  import type {LayoutData} from './$types';
  import {PUBLIC_APP_URL} from '$env/static/public';
  import {page} from '$app/stores';
  import {playerStore} from '$lib/stores';
  import Player from '../components/player.svelte';
  import Header from '../components/header.svelte';
  import Footer from '../components/footer.svelte';

  export let data: LayoutData;

  const url = new URL(data.canonical, PUBLIC_APP_URL);

  $: song = $playerStore;

  let title: string;
  $: {
    title = data.app;
    if (song) {
      if (song.parent) {
        title = `${title} - ${song.parent.title}`;
      }
      title = `${title} - ${song.title}`;
    } else if ($page.data.heading) {
      title = `${title} - ${$page.data.heading}`;
    }
  }

  let isBrowse: boolean;
  let isBookmarks: boolean;
  let isSettings: boolean;

  $: {
    isBookmarks = /^\/bookmarks/.test($page.url.pathname);
    isSettings = /^\/settings/.test($page.url.pathname);
    isBrowse = !(isBookmarks || isSettings);
  }
</script>

<svelte:head>
  <title>{title}</title>
  <link rel="canonical" href={url.href} />
</svelte:head>
<Header app={data.app} {isBrowse} {isBookmarks} {isSettings} />
<Player />
<main class="container-fluid mb-5">
  <slot />
</main>
<Footer app={data.app} />
