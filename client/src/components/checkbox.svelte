<script lang="ts">
  export let label = '';
  export let name = '';
  export let tag = 'label';
  export let toggle = false;
  export let checked: boolean = false;
  export let disabled: boolean = false;
</script>

<svelte:element
  this={tag}
  class="Checkbox"
  class:Checkbox--toggle={toggle}
  on:change
  on:input
>
  <input type="checkbox" {name} {checked} {disabled} />
  <span>{label}</span>
</svelte:element>
