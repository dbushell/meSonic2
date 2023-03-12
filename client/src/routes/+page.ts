import type {PageLoad} from './$types';
import {redirect} from '@sveltejs/kit';

export const load: PageLoad = async (event) => {
  throw redirect(307, '/podcasts');
};
