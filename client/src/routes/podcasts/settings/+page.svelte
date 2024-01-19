<script lang="ts">
  import type {ActionData, PageData} from './$types';
  import type {SubmitFunction} from '@sveltejs/kit';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {invalidate} from '$app/navigation';
  import {enhance} from '$app/forms';
  import Button from '$components/button.svelte';

  export let data: PageData;
  export let form: ActionData;

  $: podcasts = data.podcasts;

  let isAdding = false;
  let isRemoving = '';

  $: if (form?.success) {
    invalidate(new URL(`/api/podcast/all`, PUBLIC_API_URL).href);
  }

  const addEnhance: SubmitFunction = () => {
    isAdding = true;
    return async ({update}) => {
      await update();
      isAdding = false;
    };
  };

  const removeEnhance: SubmitFunction = (submit) => {
    isRemoving = submit.formData.get('id')?.toString() ?? '';
    return async ({update}) => {
      await update();
      isRemoving = '';
    };
  };
</script>

<h2>
  <a href="/podcasts">{data.heading}</a>
</h2>

<div class="List">
  {#if form?.success}
    <div><p><strong>{form.success}</strong></p></div>
  {/if}
  {#if form?.error}
    <div><p><strong>{form.error}</strong></p></div>
  {/if}
  <form
    class="Stack gap-xs"
    method="POST"
    action="/podcasts/settings?/add"
    use:enhance={addEnhance}
  >
    <label for="feed" class="p">Add Feed URL:</label>
    <div class="flex gap-xs">
      <input
        type="url"
        class="Field flex-grow-1"
        autocomplete="off"
        name="feed"
        id="feed"
        required
        disabled={isAdding}
      />
      <Button
        type="submit"
        label="Add New"
        classes={['flex-shrink-0']}
        disabled={isAdding}
      />
    </div>
  </form>
  {#each podcasts as item (item.id)}
    <form
      class="Stack gap-xs"
      method="POST"
      action="/podcasts/settings?/remove"
      use:enhance={removeEnhance}
    >
      <input type="hidden" name="id" value={item.id} />
      <label for="{item.id}-url" class="small">{item.title}:</label>
      <div class="flex gap-xs">
        <input
          type="url"
          class="Field flex-grow-1"
          id="{item.id}-url"
          value={item.url}
          readonly
          required
        />
        <Button
          type="submit"
          label="Remove"
          classes={['flex-shrink-0']}
          disabled={item.id === isRemoving}
        />
      </div>
    </form>
  {/each}
</div>
