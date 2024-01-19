import adapter from 'sveltekit-adapter-deno';
import {vitePreprocess} from '@sveltejs/vite-plugin-svelte';

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
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    serviceWorker: {
      register: process.env.NODE_ENV !== 'development'
    },
    alias: {
      $workers: 'src/workers',
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
