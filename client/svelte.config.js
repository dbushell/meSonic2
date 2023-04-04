import {vitePreprocess} from '@sveltejs/kit/vite';
import adapter from './adapter.js';

let directives = {};
if (process.env.NODE_ENV === 'production') {
  directives = {
    'form-action': ['self'],
    'script-src': ['self'],
    'base-uri': ['none'],
    'object-src': ['none'],
    'frame-ancestors': ['self']
  };
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    serviceWorker: {
      register: process.env.NODE_ENV !== 'development'
    },
    alias: {
      $components: 'src/components',
      $apiTypes: '../server/types'
    },
    csrf: {
      checkOrigin: process.env.NODE_ENV !== 'development'
    },
    csp: {
      mode: 'hash',
      directives
    }
  }
};

export default config;
