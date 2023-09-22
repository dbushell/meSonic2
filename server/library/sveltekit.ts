import * as path from 'path';
import * as env from './env.ts';
import {serveDir} from 'file_server';
import {getHeaders} from './handle.ts';

const server = (await import(path.join(env.get('BUILD_DIR'), 'server.js')))
  .default;

const initialized = server.init({
  env: {
    API_SECRET: env.get('API_SECRET'),
    PUBLIC_API_URL: env.get('APP_ORIGIN'),
    PUBLIC_APP_URL: env.get('APP_ORIGIN')
  }
});

export const sveltekit = async (
  request: Request,
  info: Deno.ServeHandlerInfo
): Promise<Response> => {
  // Get client IP address
  const clientAddress =
    request.headers.get('x-forwarded-for') ??
    (info.remoteAddr as Deno.NetAddr).hostname;

  const {pathname} = new URL(request.url);

  // Try static files (ignore redirects and errors)
  let response = await serveDir(request, {
    fsRoot: path.join(env.get('BUILD_DIR'), 'static'),
    quiet: true
  });
  if (response.ok || response.status === 304) {
    getHeaders(request).forEach((v, k) => response.headers.set(k, v));
    if (response.status === 200) {
      const ext = path.extname(pathname);
      if (['.js', '.css', '.svg', '.png', '.woff2'].includes(ext)) {
        response.headers.set(
          'cache-control',
          'public, max-age=86400, must-revalidate'
        );
      }
      if (pathname.startsWith(`/_app/immutable/`)) {
        response.headers.set(
          'cache-control',
          'public, max-age=31536000, immutable'
        );
      }
    }
    return response;
  }

  // Pass to the SvelteKit server
  await initialized;
  response = await server.respond(request, {
    getClientAddress: () => clientAddress
  });
  getHeaders(request).forEach((v, k) => response.headers.set(k, v));
  return response;
};
