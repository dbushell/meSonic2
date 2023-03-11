import type {PageLoad} from './$types';
import type {Album} from '$apiTypes';
import {PUBLIC_API_URL} from '$env/static/public';

export const load: PageLoad = async (event) => {
  const albums: Album[] = [];
  const url = new URL(`/api/album/${event.params.album_id}`, PUBLIC_API_URL);
  url.searchParams.set('bookmarks', 'true');
  url.searchParams.set('artists', 'true');
  url.searchParams.set('songs', 'true');
  const response = await event.fetch(url);
  if (response.ok) {
    const json = await response.json();
    albums.push(...json);
  }
  return {
    albums,
    heading: albums.length ? albums[0].name : 'Audiobooks'
  };
};
