-- update version
PRAGMA user_version = 2;

CREATE TABLE IF NOT EXISTS artists (
  id text PRIMARY KEY NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modified_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name text NOT NULL,
  path text NOT NULL
);

CREATE TABLE IF NOT EXISTS albums (
  id text PRIMARY KEY NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modified_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  artist_id integer NOT NULL,
  name text NOT NULL,
  path text NOT NULL
);

CREATE TABLE IF NOT EXISTS songs (
  id text PRIMARY KEY NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modified_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  artist_id integer NOT NULL,
  album_id integer NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  mimetype text NOT NULL,
  duration integer NOT NULL,
  size integer NOT NULL
);
