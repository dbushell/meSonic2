export interface ArtistEntry {
  path: string;
  name: string;
  albums: AlbumEntry[];
}

export interface AlbumEntry {
  path: string;
  name: string;
  songs: SongEntry[];
}

export interface SongEntry {
  path: string;
  name: string;
}

export type Artist = {
  id: string;
  created_at: string;
  modified_at: string;
  name: string;
  path: string;
  album_count: number;
  albums?: Album[];
}

export interface GetArtist {
  id?: string;
  path?: string;
  albums?: boolean;
  songs?: boolean;
}

export interface AddArtist {
  name: string;
  path: string;
}

export type Album = {
  id: string;
  created_at: string;
  modified_at: string;
  artist_id: string;
  name: string;
  path: string;
  song_count: number;
  songs?: Song[];
  artist?: Artist;
}

export interface GetAlbum {
  id?: string;
  path?: string;
  artist_id?: string;
  artists?: boolean;
  songs?: boolean;
  bookmarks?: boolean;
}

export interface AddAlbum {
  artist_id: string;
  name: string;
  path: string;
}

export type Song = {
  id: string;
  created_at: string;
  modified_at: string;
  artist_id: string;
  album_id: string;
  name: string;
  path: string;
  mimetype: string;
  duration: number;
  size: number;
  artist?: Artist;
  album?: Album;
  bookmarks?: Bookmark[];
}

export interface GetSong {
  id?: string;
  path?: string;
  artist_id?: string;
  album_id?: string;
  artists?: boolean;
  albums?: boolean;
  bookmarks?: boolean;
}

export interface AddSong {
  artist_id: string;
  album_id: string;
  name: string;
  path: string;
  mimetype: string;
  duration: number;
  size: number;
}

export type Podcast = {
  id: string;
  created_at: string;
  modified_at: string;
  url: string;
  title: string;
  episode_count: number;
  episodes?: Episode[];
  metadata?: Metadata[];
}

export interface GetPodcast {
  id?: string;
  url?: string;
  episodes?: boolean;
  bookmarks?: boolean;
  metadata?: boolean;
}

export interface AddPodcast {
  id: string;
  modified_at: string;
  url: string;
  title: string;
}

export interface UpdatePodcast {
  id: string;
  modified_at?: string;
  url?: string;
  title?: string;
}

export interface RemovePodcast {
  id: string;
}

export type Episode = {
  id: string;
  created_at: string;
  modified_at: string;
  parent_id: string;
  url: string;
  title: string;
  duration: number;
  type: string;
  length: number;
  parent?: Podcast;
  bookmarks?: Bookmark[];
  metadata?: Metadata[];
}

export interface GetEpisode {
  id?: string;
  url?: string;
  parent_id?: string;
  podcasts?: boolean;
  bookmarks?: boolean;
  metadata?: boolean;
}

export interface AddEpisode {
  id: string;
  modified_at: string;
  parent_id: string;
  url: string;
  title: string;
  duration: number;
  type: string;
  length: number;
}

export interface UpdateEpisode {
  id: string;
  modified_at?: string;
  url?: string;
  title?: string;
  duration?: number;
  type?: string;
  length?: number;
}

export type Bookmark = {
  id: string;
  created_at: string;
  modified_at: string;
  parent_id: string;
  parent_type: string;
  position: number;
  parent?: Song | Episode;
}

export interface GetBookmark {
  id?: string;
  parent_id?: string;
  songs?: boolean;
  albums?: boolean;
  artists?: boolean;
  episodes?: boolean;
  podcasts?: boolean;
}

export interface AddBookmark {
  parent_id: string;
  parent_type: string;
  position: number;
}

export interface RemoveBookmark {
  id?: string;
  parent_id?: string;
  parent_type?: string;
}

export interface UnplayedBookmark {
  id: string;
  parent_id: string;
}

export interface UpdateBookmark {
  id: string;
  position?: number;
}

export type Metadata = {
  id: string;
  created_at: string;
  modified_at: string;
  parent_id: string;
  parent_type: string;
  key: string;
  value: string;
}

export interface GetMetadata {
  id?: string;
  key?: string;
  parent_id?: string;
}

export interface AddMetadata {
  parent_id: string;
  parent_type: string;
  key: string;
  value: string;
}

export interface RemoveMetadata {
  id?: string;
  parent_id?: string;
}

export interface UpdateMetadata {
  id: string;
  key: string;
  value: string;
}

export interface CacheOptions {
  name: string;
  maxAge: number;
  accept: string[];
  prefetch: boolean;
  compress: boolean;
}

export interface CacheItem {
  id: string;
  name: string;
  path: string;
  options: CacheOptions;
  controller: AbortController;
  callback: () => Promise<unknown>;
}

export interface CacheResponse {
  type: 'fetch';
  id: string;
  headers: {[key: string]: string};
  body: ArrayBuffer | null;
  error?: unknown;
}

export interface CacheMeta {
  [key: string]: CacheMetaEntry;
}

export interface CacheMetaEntry {
  name: string;
  created: string;
  compressed: boolean;
  contentType: string;
}
