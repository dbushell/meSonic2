import {writeFileSync} from 'fs';
import {rollup} from 'rollup';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

// https://github.com/pluvial/svelte-adapter-deno/blob/main/index.js
// https://github.com/sveltejs/kit/blob/master/packages/adapter-node/index.js
export default function (opts = {}) {
  const {out = '../build', precompress = false, envPrefix = ''} = opts;

  return {
    name: 'deno-adapter',

    async adapt(builder) {
      const tmp = builder.getBuildDirectory('deno-adapter');

      builder.rimraf(out);
      builder.rimraf(tmp);
      builder.mkdirp(tmp);

      builder.log.minor('Copying assets');
      builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
      builder.writePrerendered(
        `${out}/prerendered${builder.config.kit.paths.base}`
      );

      if (precompress) {
        builder.log.minor('Compressing assets');
        await Promise.all([
          builder.compress(`${out}/client`),
          builder.compress(`${out}/prerendered`)
        ]);
      }

      builder.log.minor('Building server');

      builder.writeServer(tmp);

      writeFileSync(
        `${tmp}/manifest.js`,
        `export const manifest = ${builder.generateManifest({
          relativePath: './'
        })};`
      );

      const bundle = await rollup({
        input: {
          index: `${tmp}/index.js`,
          manifest: `${tmp}/manifest.js`
        },
        external: [],
        plugins: [nodeResolve(), commonjs(), json()]
      });

      await bundle.write({
        dir: `${out}/server`,
        format: 'esm',
        sourcemap: true,
        chunkFileNames: 'chunks/[name]-[hash].js'
      });
    }
  };
}
