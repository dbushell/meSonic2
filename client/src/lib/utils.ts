import type {Bookmark, Episode} from '$apiTypes';

// Format seconds to `00:00:00` duration
export const formatTime = (s: string | number) => {
  s = Number.parseInt(String(s), 10);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`.replace(/^00:/, '');
};

const relativeFormat = new Intl.RelativeTimeFormat('en-GB', {numeric: 'auto'});

const shortFormat = new Intl.DateTimeFormat('en-GB', {weekday: 'long'});

const longFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

// Limit relative format to one week
export const formatDate = (date: Date) => {
  let str;
  const now = new Date().setUTCHours(0, 0, 0, 0);
  const then = date.setUTCHours(0, 0, 0, 0);
  const days = (then - now) / 86400000;
  if (days > -6) {
    if (days > -2) {
      str = relativeFormat.format(days, 'day');
    } else {
      str = shortFormat.format(date);
    }
    str = str.charAt(0).toUpperCase() + str.slice(1);
  } else {
    str = longFormat.format(date);
  }
  return str;
};

// Return progress percentage
export const progress = (bookmark: Bookmark, duration?: number) => {
  if (bookmark.parent) duration = bookmark.parent.duration;
  if (!duration) return 0;
  return (100 / duration) * (bookmark.position / 1000);
};
