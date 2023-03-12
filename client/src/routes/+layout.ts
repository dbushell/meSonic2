import type {LayoutLoad} from './$types';

export const load: LayoutLoad = async (event) => {
  return {
    ...event.data,
    app: 'meSonic²',
    heading: 'meSonic²',
    canonical: event.url.href
  };
};
