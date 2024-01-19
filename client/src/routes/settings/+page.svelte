<script lang="ts">
  import type {PageData} from './$types';
  import {settingStore} from '$lib/stores';
  import Checkbox from '$components/checkbox.svelte';
  import Range from '$components/range.svelte';

  export let data: PageData;

  const onRateChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    settingStore.set({
      ...$settingStore,
      rate: String(target.value).padEnd(3, '.0')
    });
  };

  const onSkipChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    settingStore.set({
      ...$settingStore,
      skip: Number.parseInt(target.value)
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

<h2>{data.heading}</h2>

<div class="List">
  <div class="Stack">
    <Checkbox
      toggle
      label="Offline mode"
      checked={$settingStore.offline}
      on:input={onOfflineChange}
    />
  </div>
  <div class="Stack">
    <p class="mb-1" id="playback-skip">Skip duration</p>
    <div class="small flex jc-between ai-center" aria-hidden="true">
      <span class="monospace">5</span>
      <span class="monospace inline-flex ai-center">
        <span>{$settingStore.skip}</span>
        <span>s</span>
      </span>
      <span class="monospace">60</span>
    </div>
    <Range
      max="60"
      min="5"
      step="5"
      value={$settingStore.skip}
      on:change={onSkipChange}
      on:input={onSkipChange}
    />
  </div>
  <div class="Stack">
    <p class="mb-1" id="playback-rate">Playback rate</p>
    <div class="small flex jc-between ai-center" aria-hidden="true">
      <span class="monospace">1.0</span>
      <span class="monospace inline-flex ai-center">
        <span>{$settingStore.rate}</span>
        <span>&times;</span>
      </span>
      <span class="monospace">2.0</span>
    </div>
    <Range
      max="2"
      min="1"
      step="0.1"
      value={$settingStore.rate}
      on:change={onRateChange}
      on:input={onRateChange}
    />
  </div>
</div>
