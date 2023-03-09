<script lang="ts">
  import {onDestroy} from 'svelte';
  import type {Episode} from '$apiTypes';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {
    playStore,
    playerStore,
    settingStore,
    offlineStore,
    addBookmark,
    removeBookmark
  } from '$lib/stores';
  import {getOffline, deleteOffline} from '$lib/offline';
  import {formatTime} from '$lib/utils';
  import Wifioff from '$components/icons/wifioff.svelte';
  import RewindButton from '$components/rewind.svelte';
  import ForwardButton from '$components/forward.svelte';
  import PauseButton from '$components/pause.svelte';
  import PlayButton from '$components/play.svelte';
  import Atom from '$components/atom.svelte';

  let audio: HTMLAudioElement;
  let audioSrc: string = '';
  let song: Episode | null;

  let bookmarkInterval: number;
  let seekingTimeout: number;
  let seekTimeout: number;
  let onLoadedPosition = 0;
  let playbackRate = 1.0;
  let isOffline = false;
  let isPlaying = false;
  let isSeeking = false;
  let isLoaded = false;
  let rangeValue = 0;
  let rangeMax = 0;
  let rangeNow: string;
  let rangeStart = '00:00';
  let rangeEnd = '00:00';
  const unsubscribe: Array<() => unknown> = [];

  $: {
    rangeNow = formatTime(rangeValue);
    rangeEnd = formatTime(rangeMax - rangeValue);
  }

  const resetAudio = () => {
    isLoaded = false;
    isSeeking = false;
    isPlaying = false;
    rangeValue = 0;
    rangeMax = 0;
    rangeStart = '00:00';
    rangeEnd = '00:00';
    clearTimeout(seekTimeout);
    clearInterval(bookmarkInterval);
    if (audio) {
      audio.currentTime = 0;
    }
  };

  const setBookmark = () => {
    if (song && audio) {
      const position = audio.currentTime * 1000;
      if (position !== onLoadedPosition) {
        addBookmark({parent_id: song.id, position});
      }
    }
  };

  onDestroy(() => {
    unsubscribe.forEach((fn) => fn());
    resetAudio();
  });

  unsubscribe.push(
    settingStore.subscribe((settings) => {
      isOffline = Boolean(settings.offline);
      playbackRate = Number.parseFloat(settings.rate);
      if (audio) {
        audio.playbackRate = playbackRate;
      }
    })
  );

  unsubscribe.push(
    playerStore.subscribe(async (newSong) => {
      if (!newSong) {
        song = null;
        resetAudio();
        return;
      }
      const cached = $offlineStore.cached.includes(newSong.id);
      if (isOffline && !cached) {
        alert('Cannot play in offline mode');
        playStore.set('');
        return;
      }
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
      if (cached) {
        const blob = await getOffline(newSong.id);
        if (blob) {
          audioSrc = URL.createObjectURL(blob);
        } else {
          console.error('Blob not found');
          playStore.set('');
          return;
        }
      } else {
        audioSrc = new URL(`/audio/${newSong.id}`, PUBLIC_API_URL).href;
      }
      if (song) {
        if (song.id !== newSong.id) {
          if (isPlaying) {
            setBookmark();
          }
          song = newSong;
          resetAudio();
        }
      } else {
        song = newSong;
        resetAudio();
      }
    })
  );

  const onLoaded = (ev: Event) => {
    if (isLoaded) {
      return;
    }
    isLoaded = true;
    rangeMax = Math.round(audio.duration);
    rangeEnd = formatTime(rangeMax);
    audio.playbackRate = playbackRate;
    onLoadedPosition = 0;

    if (song?.bookmarks?.length) {
      onLoadedPosition = song.bookmarks[0].position;
      audio.currentTime = onLoadedPosition / 1000;
    } else {
      audio.currentTime = 0;
    }
    audio.play();
  };

  const onTimeUpdate = () => {
    rangeValue = Math.round(audio.currentTime);
    rangeStart = rangeNow;
  };

  const onPlay = () => {
    isPlaying = true;
    bookmarkInterval = window.setInterval(() => {
      if (isPlaying) {
        setBookmark();
      } else {
        clearInterval(bookmarkInterval);
      }
    }, 60000);
  };

  const onPause = () => {
    isPlaying = false;
    if (!audio.ended) {
      setBookmark();
    }
  };

  const onSeeked = () => {
    rangeStart = rangeNow;
    clearTimeout(seekTimeout);
    if (!audio.ended) {
      seekTimeout = window.setTimeout(setBookmark, 1000);
    }
  };

  const onEnded = () => {
    isPlaying = false;
    if (song) {
      removeBookmark({parent_id: song.id});
      deleteOffline(song.id);
    }
  };

  const onRangeInput = () => {
    isSeeking = true;
    clearTimeout(seekingTimeout);
    seekingTimeout = window.setTimeout(() => (isSeeking = false), 500);
  };

  const onRangeChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    audio.currentTime = Number.parseFloat(target.value);
  };

  const onBeforeUnload = (ev: BeforeUnloadEvent) => {
    if (isPlaying) {
      audio.pause();
      ev.preventDefault();
      return (ev.returnValue = '...');
    }
  };
</script>

<svelte:window on:beforeunload|capture={onBeforeUnload} />
<aside
  class="container-fluid mt-0 mb-3 py-3 bg-body border-bottom position-sticky top-0"
>
  <div class="d-flex flex-wrap align-items-center mb-1">
    <h2 class="visually-hidden">Audio Player</h2>
    {#if song}
      <p class="h6 lh-base m-0 me-auto">
        <img
          alt={song.title}
          src={new URL(`/artwork/${song.parent_id}`, PUBLIC_API_URL).href}
          class="d-inline-block align-top rounded overflow-hidden me-1"
          width="24"
          height="24"
          loading="lazy"
        />
        {#if !isLoaded}
          <span role="status" class="spinner-border spinner-border-sm me-1">
            <span class="visually-hidden">Loading…</span>
          </span>
        {/if}
        {#if isOffline}<Wifioff />{/if}
        <span>{song.title}</span>
      </p>
      {#if song.parent}
        <div class="d-flex flex-wrap">
          <a
            href={`/podcasts/${song.parent_id}`}
            class="text-body-secondary fs-7 me-2"
          >
            {song.parent.title}
          </a>
        </div>
      {/if}
    {:else}
      <p class="h6 lh-base m-0 text-body-secondary">
        {#if isOffline}
          <Wifioff />
          <span>Offline mode…</span>
        {:else}
          <span>Not playing…</span>
        {/if}
      </p>
    {/if}
  </div>
  <div
    class="position-relative mb-2"
    style="--range-value: {rangeValue}; --range-max: {rangeMax};"
  >
    <input
      type="range"
      class="form-range d-block"
      aria-label="progress"
      bind:value={rangeValue}
      on:change={onRangeChange}
      on:input={onRangeInput}
      disabled={!isLoaded}
      max={rangeMax}
      min={0}
    />
    {#if isSeeking}
      <div
        role="tooltip"
        class="popover bs-popover-top bg-dark-subtle border-dark-subtle pe-none position-absolute bottom-100"
        style="--offset: calc((100% - 1em) / var(--range-max) * var(--range-value)); top: auto; left: var(--offset); transform: translateX(calc(-50% + 0.5em));"
      >
        <div
          class="popover-arrow border-dark-subtle position-absolute top-100 start-50 translate-middle-x"
        />
        <div class="popover-body text-light font-monospace fs-7 p-1 px-2">
          {rangeNow}
        </div>
      </div>
    {/if}
    <Atom {isPlaying} />
    <Atom {isPlaying} />
  </div>
  <div
    aria-hidden={!isLoaded}
    class="d-flex justify-content-between align-items-center player-toolbar"
  >
    <p class="text-body-secondary m-0 order-1">
      <span class="visually-hidden">Current time</span>
      <span class="fs-7 fw-light font-monospace">{rangeStart}</span>
    </p>
    <p class="text-body-secondary text-end m-0 order-3">
      <span class="visually-hidden">Duration</span>
      <span class="fs-7 fw-light font-monospace">-{rangeEnd}</span>
    </p>
    <div class="btn-toolbar justify-content-center order-2">
      <div
        class="btn-group flex-grow-1"
        aria-label="playback controls"
        role="toolbar"
      >
        <RewindButton
          isDisabled={!isLoaded}
          on:click={() => (audio.currentTime -= 15)}
        />
        {#if isPlaying}
          <PauseButton isDisabled={!isLoaded} on:click={() => audio.pause()} />
        {:else}
          <PlayButton isDisabled={!isLoaded} on:click={() => audio.play()} />
        {/if}
        <ForwardButton
          isDisabled={!isLoaded}
          on:click={() => (audio.currentTime += 15)}
        />
      </div>
    </div>
  </div>
  {#if song}
    <audio
      bind:this={audio}
      {playbackRate}
      on:timeupdate={onTimeUpdate}
      on:seeked={onSeeked}
      on:pause={onPause}
      on:play={onPlay}
      on:ended={onEnded}
      on:loadeddata={onLoaded}
      on:loadedmetadata={onLoaded}
      on:canplay={onLoaded}
      on:canplaythrough={onLoaded}
      src={audioSrc}
      preload="metadata"
    />
  {/if}
</aside>
