import type {Actions} from './$types';
import {fail} from '@sveltejs/kit';
import {PUBLIC_API_URL} from '$env/static/public';

export const actions: Actions = {
  remove: async (event) => {
    try {
      const form = await event.request.formData();
      const id = form.get('id')?.toString() ?? '';
      const url = new URL(`/api/podcast/remove`, PUBLIC_API_URL);
      const response = await event.fetch(url, {
        method: 'POST',
        body: JSON.stringify({id}),
        headers: {
          'content-type': 'application/json'
        }
      });
      if (response.status !== 200) {
        throw new Error();
      }
    } catch (err) {
      return fail(400, {error: 'Error removing podcast'});
    }
    return {success: 'Podcast removed'};
  },
  add: async (event) => {
    try {
      const form = await event.request.formData();
      const feed = form.get('feed')?.toString() ?? '';
      const url = new URL(`/api/podcast/add`, PUBLIC_API_URL);
      const response = await event.fetch(url, {
        method: 'POST',
        body: JSON.stringify({feed}),
        headers: {
          'content-type': 'application/json'
        }
      });
      if (response.status !== 200) {
        throw new Error();
      }
    } catch (err) {
      return fail(400, {error: 'Error adding podcast'});
    }
    return {success: 'Podcast added'};
  }
};
