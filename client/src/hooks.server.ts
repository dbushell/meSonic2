import type {Handle, HandleFetch, HandleServerError} from '@sveltejs/kit';
import {PUBLIC_API_URL, PUBLIC_APP_URL} from '$env/static/public';
import {DEV, API_SECRET} from '$env/static/private';
import {sequence} from '@sveltejs/kit/hooks';

export const debugHandle: Handle = async ({event, resolve}) => {
  return resolve(event);
};

export const handle = sequence(debugHandle);

export const handleFetch: HandleFetch = async ({request, fetch}) => {
  if (request.url.startsWith(PUBLIC_API_URL)) {
    request.headers.set('authorization', `Bearer ${API_SECRET}`);
    request.headers.set('origin', PUBLIC_APP_URL);
  }
  return fetch(request);
};

export const handleError: HandleServerError = async ({event, error}) => {
  if (DEV === 'true') console.error(error);
  return {
    message: event.route.id === null ? 'Not Found' : 'Internal Error'
  };
};
