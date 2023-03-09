<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import Counterclockwise from './icons/counterclockwise.svelte';

  const dispatch = createEventDispatcher();

  export let isDisabled: boolean;
</script>

<button
  disabled={isDisabled}
  on:click={() => dispatch('click')}
  type="button"
  aria-label="rewind 15 seconds"
  class="btn btn-outline-primary text-nowrap"
>
  <Counterclockwise />
  <span
    aria-hidden="true"
    class="fs-7 font-monospace position-absolute top-50 start-50 translate-middle"
  >
    15
  </span>
</button>
