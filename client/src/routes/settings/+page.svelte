<script lang="ts">
  import type {PageData} from './$types';
  import {settingStore} from '$lib/stores';

  export let data: PageData;

  const onRateChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    settingStore.set({
      ...$settingStore,
      rate: String(target.value).padEnd(3, '.0')
    });
  };

  const onOfflineChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    settingStore.set({
      ...$settingStore,
      offline: Boolean(target.checked)
    });
  };
</script>

<h2 class="text-warning mb-3 fs-3">{data.heading}</h2>
<p class="mb-1" id="playback-rate">Playback rate</p>
<div
  class="d-flex justify-content-between align-items-center"
  aria-hidden="true"
>
  <p class="text-body-secondary m-0">
    <span class="fs-7 fw-light font-monospace">1.0</span>
  </p>
  <p class="m-0 fs-6 text-success d-inline-flex align-items-center">
    <span class="ms-1 font-monospace">{$settingStore.rate}</span>
    <span>&times;</span>
  </p>
  <p class="text-body-secondary text-end m-0 ">
    <span class="fs-7 fw-light font-monospace">2.0</span>
  </p>
</div>
<input
  type="range"
  class="form-range d-block text-success"
  style="--range-color: var(--bs-green);"
  aria-labelledby="playback-rate"
  max="2"
  min="1"
  step="0.1"
  value={$settingStore.rate}
  on:change={onRateChange}
  on:input={onRateChange}
/>

<div class="mt-4 pt-4 border-top">
  <div class="form-check form-switch">
    <input
      type="checkbox"
      class="form-check-input"
      id="playback-offline"
      checked={$settingStore.offline}
      on:input={onOfflineChange}
    />
    <label
      class="form-check-label"
      class:text-primary={$settingStore.offline}
      for="playback-offline"
    >
      Offline mode
    </label>
  </div>
</div>
