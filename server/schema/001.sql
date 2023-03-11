-- update version
PRAGMA user_version = 1;

CREATE TABLE IF NOT EXISTS podcasts (
  id text PRIMARY KEY NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modified_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  url text NOT NULL,
  title text NOT NULL
);

CREATE TABLE IF NOT EXISTS episodes (
  id text PRIMARY KEY NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modified_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  parent_id text NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  duration integer NOT NULL,
  type text NOT NULL,
  length integer NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id text PRIMARY KEY NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modified_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  parent_id text NOT NULL,
  parent_type text NULL,
  position integer NOT NULL
);

CREATE TABLE IF NOT EXISTS metadata (
  id text PRIMARY KEY NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modified_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  parent_id text NOT NULL,
  parent_type text NULL,
  key text NOT NULL,
  value text NOT NULL
);
