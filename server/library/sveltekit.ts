import * as path from 'path';
import * as env from './env.ts';
import {serveDir} from 'file_server';
import {getHeaders} from './handle.ts';

// TODO: check build files exist
const kit = [
  path.join(env.get('BUILD_DIR'), 'server/index.js'),
  path.join(env.get('BUILD_DIR'), 'server/manifest.js')
];

const {Server} = await import(kit[0]);
const {manifest} = await import(kit[1]);

const server = new Server(manifest) as {
  init(options: {env: Record<string, string>}): Promise<void>;
  respond(
    request: Request,
    options: {
      getClientAddress(): string;
    }
  ): Promise<Response>;
};

await server.init({
  env: {
    API_SECRET: env.get('API_SECRET'),
    PUBLIC_API_URL: env.get('APP_ORIGIN'),
    PUBLIC_APP_URL: env.get('APP_ORIGIN')
  }
});

export const sveltekit = async (
  url: URL,
  request: Request
): Promise<Response> => {
  let response: Response = await serveDir(request, {
    fsRoot: path.join(env.get('BUILD_DIR'), 'client'),
    quiet: true
  });
  if (response && (response.ok || response.status < 400)) {
    getHeaders(request).forEach((value, key) => {
      response.headers.set(key, value);
    });
    const ext = path.extname(url.pathname);
    if (['.js', '.css', '.svg', '.png', '.woff2'].includes(ext)) {
      response.headers.set(
        'cache-control',
        'public, max-age=86400, must-revalidate'
      );
    }
    if (url.pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
      response.headers.set(
        'cache-control',
        'public, max-age=31536000, immutable'
      );
    }
    return response;
  }
  response = await server.respond(request, {
    // https://github.com/oakserver/oak/blob/main/request.ts#L39
    getClientAddress() {
      return request.headers.get('x-forwarded-for') ?? '';
    }
  });
  if (response) {
    getHeaders(request).forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }
  throw new Error('We should not be here...');
};
