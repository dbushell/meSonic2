<script lang="ts">
  import {version} from '$app/environment';
  import GitHub from './icons/github.svelte';

  export let app: string;

  const year = new Date().getFullYear();
</script>

<footer
  class="container-fluid text-center fs-7 pb-5 mt-auto"
  aria-label="information"
>
  <p class="text-body-tertiary text-center text-nowrap d-inline-flex flex-wrap justify-content-center align-items-center column-gap-2 row-gap-2 m-0">
    <span>{app}</span>
    <span>© {year}</span>
    <a
      rel="noreferrer"
      href="https://dbushell.com/"
      class="text-body-tertiary"
      target="_blank"
    >
      David Bushell
    </a>
    <a
      rel="noreferrer"
      href="https://github.com/dbushell/mesonic2"
      class="text-body-tertiary"
      target="_blank"
    >
      <GitHub />
      <span class="visually-hidden">GitHub</span>
    </a>
    <span class="badge text-body-tertiary bg-dark-subtle font-monospace">{version}</span>
  </p>
</footer>
