<script lang="ts">
  import {onDestroy} from 'svelte';
  import type {Song, Episode} from '$apiTypes';
  import {browser} from '$app/environment';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {
    playStore,
    nextStore,
    playerStore,
    settingStore,
    offlineStore,
    addBookmark,
    removeBookmark
  } from '$lib/stores';
  import {getOffline, removeOffline} from '$lib/offline';
  import {formatTime} from '$lib/utils';
  import PlayerSong from './player-song.svelte';
  import PlayerEpisode from './player-episode.svelte';
  import RewindButton from '$components/rewind.svelte';
  import ForwardButton from '$components/forward.svelte';
  import PauseButton from '$components/pause.svelte';
  import PlayButton from '$components/play.svelte';
  import Atom from '$components/atom.svelte';

  $: play = $playStore;
  $: next = $nextStore;
  $: player = $playerStore;

  let oldPlayer: Song | Episode | null = null;
  let audio: HTMLAudioElement;
  let audioSrc: string = '';

  let bookmarkInterval: number;
  let seekingTimeout: number;
  let seekTimeout: number;
  let onLoadedPosition = 0;
  let playbackRate = 1.0;
  let isDownload = false;
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
    if (player && audio) {
      const position = audio.currentTime * 1000;
      if (play && position !== onLoadedPosition) {
        addBookmark({parent_id: player.id, parent_type: play.type, position});
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
    playerStore.subscribe(async (newPlayer) => {
      if (!newPlayer) {
        oldPlayer = null;
        resetAudio();
        return;
      }
      if (/^blob:/.test(audioSrc)) {
        URL.revokeObjectURL(audioSrc);
      }
      isDownload = $offlineStore.cached.includes(newPlayer.id);
      if (isOffline && !isDownload) {
        alert('Cannot play in offline mode');
        playStore.set(undefined);
        return;
      }
      if (isDownload) {
        const blob = await getOffline(newPlayer.id);
        if (blob) {
          audioSrc = URL.createObjectURL(blob);
        } else {
          console.error('Blob not found');
          playStore.set(undefined);
          return;
        }
      } else {
        if (play?.type === 'song') {
          const url = new URL(`/audio/${newPlayer.id}`, PUBLIC_API_URL);
          url.searchParams.set('type', 'song');
          audioSrc = url.href;
        }
        if (play?.type === 'episode') {
          const url = new URL(`/audio/${newPlayer.id}`, PUBLIC_API_URL);
          url.searchParams.set('type', 'episode');
          audioSrc = url.href;
        }
      }
      if (oldPlayer && oldPlayer.id === newPlayer.id) {
        setBookmark();
      } else {
        resetAudio();
      }
      oldPlayer = newPlayer;
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
    if (player?.bookmarks?.length) {
      onLoadedPosition = player.bookmarks[0].position;
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
    if (/^blob:/.test(audioSrc)) {
      URL.revokeObjectURL(audioSrc);
    }
    if (!play) return;
    removeBookmark({parent_id: play.id, parent_type: play.type});
    removeOffline(play.id);
    if (next) {
      playStore.set(next);
    } else {
      playStore.set(undefined);
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

  const skipForward = () => {
    audio.currentTime += $settingStore.skip;
  };
  const skipBackward = () => {
    audio.currentTime -= $settingStore.skip;
  };
  if (browser) {
    navigator.mediaSession.setActionHandler('seekbackward', skipBackward);
    navigator.mediaSession.setActionHandler('seekforward', skipForward);
    navigator.mediaSession.setActionHandler('previoustrack', skipBackward);
    navigator.mediaSession.setActionHandler('nexttrack', skipForward);
  }
</script>

<svelte:window on:beforeunload|capture={onBeforeUnload} />
<aside id="player" class="Grid | Container Container--light">
  <div class="Stack gap-s">
    {#if play}
      <div class="flex flex-wrap gap-xs ai-center jc-between">
        {#if play.id === player?.id}
          <h2 class="hidden">Audio Player</h2>
          {#if play.type === 'song'}
            <PlayerSong {isLoaded} {isOffline} {isDownload} />
          {:else if play.type === 'episode'}
            <PlayerEpisode {isLoaded} {isOffline} {isDownload} />
          {/if}
        {:else}
          <p>
            <span>Loading...</span>
          </p>
        {/if}
      </div>
    {/if}
    <div style:--range-value={rangeValue} style:--range-max={rangeMax}>
      <progress class="Progress" value={rangeValue} max={rangeMax}></progress>
      <input
        type="range"
        class="Range"
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
          style:--range-value={rangeValue}
          style:--range-max={rangeMax}
        >
          {rangeNow}
        </div>
      {/if}
      <Atom {isPlaying} />
      <Atom {isPlaying} />
    </div>
    <div aria-hidden={!isLoaded} class="flex gap-xs jc-between ai-center">
      <div class="order-1">
        <span class="hidden">Current time</span>
        <span class="small monospace">{rangeStart}</span>
      </div>
      <div class="order-3">
        <span class="hidden">Duration</span>
        <span class="small monospace">-{rangeEnd}</span>
      </div>
      <div
        class="Button-group jc-center order-2"
        aria-label="playback controls"
        role="toolbar"
      >
        <RewindButton
          skip={$settingStore.skip}
          isDisabled={!isLoaded}
          on:click={skipBackward}
        />
        {#if isPlaying}
          <PauseButton isDisabled={!isLoaded} on:click={() => audio.pause()} />
        {:else}
          <PlayButton isDisabled={!isLoaded} on:click={() => audio.play()} />
        {/if}
        <ForwardButton
          skip={$settingStore.skip}
          isDisabled={!isLoaded}
          on:click={skipForward}
        />
      </div>
    </div>
    {#if player && audioSrc}
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
  </div>
</aside>
