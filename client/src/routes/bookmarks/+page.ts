import type {Bookmark} from '$apiTypes';
import type {PageLoad} from './$types';
import {PUBLIC_API_URL} from '$env/static/public';

export const load: PageLoad = async (event) => {
  const bookmarks: Bookmark[] = [];
  const url = new URL(`/api/bookmark/all`, PUBLIC_API_URL);
  url.searchParams.set('songs', 'true');
  url.searchParams.set('albums', 'true');
  url.searchParams.set('artists', 'true');
  url.searchParams.set('episodes', 'true');
  url.searchParams.set('podcasts', 'true');
  const response = await event.fetch(url);
  if (response.ok) {
    const json = await response.json();
    bookmarks.push(...json);
  }
  return {
    bookmarks,
    heading: 'Bookmarks'
  };
};
