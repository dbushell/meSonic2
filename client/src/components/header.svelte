<script lang="ts">
  import Button from '$components/button.svelte';
  import Browse from './icons/browse.svelte';
  import Settings from './icons/settings.svelte';
  import Bookmarks from './icons/bookmarks.svelte';
  import Cassette from './icons/cassette.svelte';

  export let app: string;
  export let isMedia: boolean;
  export let isPodcasts: boolean;
  export let isBookmarks: boolean;
  export let isSettings: boolean;
</script>

<header class="Grid | Header">
  <div class="Header__main">
    <a class="Header__logo | flex gap-2xs ai-center" href="/">
      <img
        class="flex-shrink-0"
        src="/logo.svg"
        role="presentation"
        alt={app}
        width="30"
        height="30"
      />
      <span>{app}</span>
    </a>
    <div class="Header__tabs">
      <div class="Button-tabs">
        <Button
          icon
          small
          label="Podcasts"
          href="/podcasts"
          attr={{
            'aria-current': isPodcasts ? 'page' : 'false'
          }}
        >
          <Browse slot="icon" />
        </Button>
        <Button
          icon
          small
          label="Three"
          href="/audiobooks"
          attr={{
            'aria-current': isMedia ? 'page' : 'false'
          }}
        >
          <Cassette slot="icon" />
        </Button>
        <Button
          icon
          small
          label="Three"
          href="/bookmarks"
          attr={{
            'aria-current': isBookmarks ? 'page' : 'false'
          }}
        >
          <Bookmarks slot="icon" />
        </Button>
        <Button
          icon
          small
          label="Three"
          href="/settings"
          attr={{
            'aria-current': isSettings ? 'page' : 'false'
          }}
        >
          <Settings slot="icon" />
        </Button>
      </div>
    </div>
  </div>
</header>
