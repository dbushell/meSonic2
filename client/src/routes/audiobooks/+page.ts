import type {Artist} from '$apiTypes';
import type {PageLoad} from './$types';
import {PUBLIC_API_URL} from '$env/static/public';

export const load: PageLoad = async (event) => {
  const artists: Artist[] = [];
  const url = new URL(`/api/artist/all`, PUBLIC_API_URL);
  const response = await event.fetch(url);
  if (response.ok) {
    const json = await response.json();
    artists.push(...json);
  }
  return {
    artists,
    heading: 'Audibooks'
  };
};
