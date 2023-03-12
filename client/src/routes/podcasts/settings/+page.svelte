<script lang="ts">
  import type {ActionData, PageData} from './$types';
  import type {SubmitFunction} from '@sveltejs/kit';
  import {PUBLIC_API_URL} from '$env/static/public';
  import {invalidate} from '$app/navigation';
  import {enhance} from '$app/forms';

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
    isRemoving = submit.data.get('id')?.toString() ?? '';
    return async ({update}) => {
      await update();
      isRemoving = '';
    };
  };
</script>

<h2 class="mb-3 fs-3">
  <a href="/podcasts" class="text-warning text-decoration-none"
    >{data.heading}</a
  >
</h2>

<div class="list-group">
  {#if form?.success}
    <div class="list-group-item text-success">{form.success}</div>
  {/if}
  {#if form?.error}
    <div class="list-group-item text-danger">{form.error}</div>
  {/if}
  <form
    class="list-group-item py-3"
    method="POST"
    action="/podcasts/settings?/add"
    use:enhance={addEnhance}
  >
    <label for="feed" class="form-label text-body-emphasis">Add Feed URL:</label
    >
    <div class="mb-3 d-flex">
      <input
        type="url"
        class="form-control me-2"
        autocomplete="off"
        name="feed"
        id="feed"
        required
        disabled={isAdding}
      />
      <button
        type="submit"
        class="btn btn-outline-success text-nowrap"
        disabled={isAdding}
      >
        Add New
        {#if isAdding}
          <span role="status" class="spinner-border spinner-border-sm ms-1" />
        {/if}
      </button>
    </div>
  </form>
  {#each podcasts as item (item.id)}
    <form
      class="list-group-item py-3"
      method="POST"
      action="/podcasts/settings?/remove"
      use:enhance={removeEnhance}
    >
      <input type="hidden" name="id" value={item.id} />
      <label for="{item.id}-url" class="form-label text-body-emphasis"
        >{item.title}:</label
      >
      <div class="d-flex">
        <input
          type="url"
          class="form-control form-control-sm me-2"
          id="{item.id}-url"
          value={item.url}
          readonly
          required
        />
        <button
          type="submit"
          class="btn btn-sm btn-outline-danger text-nowrap"
          disabled={item.id === isRemoving}
        >
          Remove
          {#if item.id === isRemoving}
            <span role="status" class="spinner-border spinner-border-sm ms-1" />
          {/if}
        </button>
      </div>
    </form>
  {/each}
</div>
