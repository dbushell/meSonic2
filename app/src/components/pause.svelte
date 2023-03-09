<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import Pause from './icons/pause.svelte';

  const dispatch = createEventDispatcher();

  export let isDisabled: boolean;
</script>

<button
  disabled={isDisabled}
  on:click={() => dispatch('click')}
  type="button"
  aria-label="pause"
  class="btn btn-outline-primary"
>
  <Pause />
</button>
