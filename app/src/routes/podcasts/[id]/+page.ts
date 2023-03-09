import type {PageLoad} from './$types';
import type {Podcast} from '$apiTypes';
import {PUBLIC_API_URL} from '$env/static/public';

export const load: PageLoad = async (event) => {
  const podcasts: Podcast[] = [];
  const url = new URL(`/api/podcast/${event.params.id}`, PUBLIC_API_URL);
  url.searchParams.set('episodes', 'true');
  url.searchParams.set('bookmarks', 'true');
  url.searchParams.set('metadata', 'true');
  const response = await event.fetch(url);
  if (response.ok) {
    const json = await response.json();
    podcasts.push(...json);
  }
  return {
    podcasts,
    heading: podcasts.length ? podcasts[0].title : 'Unknown',
    mainHeading: 'Episodes'
  };
};
