import type {Podcast} from '$apiTypes';
import type {PageLoad} from './$types';
import {PUBLIC_API_URL} from '$env/static/public';

export const load: PageLoad = async (event) => {
  const podcasts: Podcast[] = [];
  const url = new URL(`/api/podcast/all`, PUBLIC_API_URL);
  const response = await event.fetch(url);
  if (response.ok) {
    const json = await response.json();
    podcasts.push(...json);
  }
  return {
    podcasts,
    heading: 'Podcasts'
  };
};
