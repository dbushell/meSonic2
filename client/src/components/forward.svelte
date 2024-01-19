<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import Button from './button.svelte';
  import Clockwise from './icons/clockwise.svelte';

  const dispatch = createEventDispatcher();

  export let skip: number;
  export let isDisabled: boolean;
</script>

<Button
  icon
  type="button"
  disabled={isDisabled}
  attr={{id: 'player-forward'}}
  on:click={() => dispatch('click')}
>
  <Clockwise slot="icon" />
  <span slot="label" aria-hidden="true">
    <span class="hidden">fast-forward</span>
    <span>{skip}</span>
    <span class="hidden">seconds</span>
  </span>
</Button>
