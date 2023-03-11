import type {PageLoad} from './$types';
import type {Artist} from '$apiTypes';
import {PUBLIC_API_URL} from '$env/static/public';

export const load: PageLoad = async (event) => {
  const artists: Artist[] = [];
  const url = new URL(`/api/artist/${event.params.artist_id}`, PUBLIC_API_URL);
  url.searchParams.set('albums', 'true');
  const response = await event.fetch(url);
  if (response.ok) {
    const json = await response.json();
    artists.push(...json);
  }
  return {
    artists,
    heading: artists.length ? artists[0].name : 'Audiobooks'
  };
};
