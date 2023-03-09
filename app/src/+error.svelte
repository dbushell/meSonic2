<script lang="ts">
  import {page} from '$app/stores';
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

<h1>{$page.status}: {$page.error?.message}</h1>
