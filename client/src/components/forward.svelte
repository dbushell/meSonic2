<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import Clockwise from './icons/clockwise.svelte';

  const dispatch = createEventDispatcher();

  export let skip: number;
  export let isDisabled: boolean;
</script>

<button
  disabled={isDisabled}
  on:click={() => dispatch('click')}
  type="button"
  aria-label="fast-foward 15 seconds"
  class="btn btn-outline-primary text-nowrap"
>
  <Clockwise />
  <span
    aria-hidden="true"
    class="fs-7 font-monospace position-absolute top-50 start-50 translate-middle"
  >
    {skip}
  </span>
</button>
