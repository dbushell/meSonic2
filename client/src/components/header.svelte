<script lang="ts">
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

<header class="navbar border-bottom pb-0">
  <nav class="container-fluid align-items-end">
    <h1 class="navbar-brand py-1 mb-1 me-1">
      <a
        class="d-flex align-items-center text-decoration-none text-primary"
        href="/"
      >
        <div class="me-1">
          <img
            src="/favicon.svg"
            role="presentation"
            alt="{app}"
            width="30"
            height="30"
          />
        </div>
        <span>{app}</span>
      </a>
    </h1>
    <ul class="nav nav-tabs justify-content-end">
      <li class="nav-item">
        <a
          href="/podcasts"
          class="nav-link"
          class:active={isPodcasts}
          aria-current={isPodcasts ? 'page' : 'false'}
        >
          <Browse />
          <span class="visually-hidden">Podcasts</span>
        </a>
      </li>
      <li class="nav-item">
        <a
          href="/audiobooks"
          class="nav-link"
          class:active={isMedia}
          aria-current={isMedia ? 'page' : 'false'}
        >
          <Cassette />
          <span class="visually-hidden">Media</span>
        </a>
      </li>
      <li class="nav-item">
        <a
          href="/bookmarks"
          class="nav-link"
          class:active={isBookmarks}
          aria-current={isBookmarks ? 'page' : 'false'}
        >
          <Bookmarks />
          <span class="visually-hidden">Bookmarks</span>
        </a>
      </li>
      <li class="nav-item">
        <a
          href="/settings"
          class="nav-link"
          class:active={isSettings}
          aria-current={isSettings ? 'page' : 'false'}
        >
          <Settings />
          <span class="visually-hidden">Settings</span>
        </a>
      </li>
    </ul>
  </nav>
</header>
