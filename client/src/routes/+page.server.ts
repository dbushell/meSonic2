import type {PageServerLoad} from './$types';
import {redirect} from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
  throw redirect(307, '/podcasts');
};
