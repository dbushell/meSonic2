<script type="ts">
  export let value = 0;
  export let step = 1;
  export let min = 0;
  export let max = 100;
  export let disabled = false;
</script>

<input
  class="Range"
  type="range"
  {value}
  {step}
  {min}
  {max}
  {disabled}
  on:change
  on:input
/>
