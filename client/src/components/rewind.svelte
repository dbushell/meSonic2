<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import Button from './button.svelte';
  import Counterclockwise from './icons/counterclockwise.svelte';

  const dispatch = createEventDispatcher();

  export let skip: number;
  export let isDisabled: boolean;
</script>

<Button
  icon
  type="button"
  disabled={isDisabled}
  attr={{id: 'player-rewind'}}
  on:click={() => dispatch('click')}
>
  <Counterclockwise slot="icon" />
  <span slot="label" aria-hidden="true">
    <span class="hidden">rewind</span>
    <span>{skip}</span>
    <span class="hidden">seconds</span>
  </span>
</Button>
