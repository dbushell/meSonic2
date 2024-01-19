<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import Button from './button.svelte';
  import Play from './icons/play.svelte';

  const dispatch = createEventDispatcher();

  export let isDisabled: boolean;
</script>

<Button
  icon
  type="button"
  label="Play"
  disabled={isDisabled}
  attr={{id: 'player-play'}}
  on:click={() => dispatch('click')}
>
  <Play slot="icon" />
</Button>
