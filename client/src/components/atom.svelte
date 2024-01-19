<script lang="ts">
  export let isPlaying: boolean;
</script>

<div class="Atom" hidden={!isPlaying} aria-hidden="true">
  <svg viewBox="0 0 100 100">
    <path
      d="M50 0a5 5 0 0 0 0 10v.006A45.028 45.028 0 0 1 52.316 100 50.027 50.027 0 0 0 50 0z"
    />
  </svg>
</div>
