<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import Button from './button.svelte';
  import Pause from './icons/pause.svelte';

  const dispatch = createEventDispatcher();

  export let isDisabled: boolean;
</script>

<Button
  icon
  type="button"
  label="Pause"
  disabled={isDisabled}
  attr={{id: 'player-pause'}}
  on:click={() => dispatch('click')}
>
  <Pause slot="icon" />
</Button>
