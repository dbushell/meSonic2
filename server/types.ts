export interface Podcast {
  [key: string]: string | number | Episode[] | Metadata[] | undefined;
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
  [key: string]: string | boolean | undefined;
  id?: string;
  url?: string;
  episodes?: boolean;
  bookmarks?: boolean;
  metadata?: boolean;
}

export interface AddPodcast {
  [key: string]: string;
  id: string;
  modified_at: string;
  url: string;
  title: string;
}

export interface UpdatePodcast {
  [key: string]: string | undefined;
  id: string;
  modified_at?: string;
  url?: string;
  title?: string;
}

export interface Episode {
  [key: string]:
    | string
    | number
    | Podcast
    | Bookmark[]
    | Metadata[]
    | undefined;
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
  [key: string]: string | boolean | undefined;
  id?: string;
  url?: string;
  parent_id?: string;
  podcasts?: boolean;
  bookmarks?: boolean;
  metadata?: boolean;
}

export interface AddEpisode {
  [key: string]: string | number;
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
  [key: string]: string | number | undefined;
  id: string;
  modified_at?: string;
  url?: string;
  title?: string;
  duration?: number;
  type?: string;
  length?: number;
}

export interface Bookmark {
  [key: string]: string | number | Episode | undefined;
  id: string;
  created_at: string;
  modified_at: string;
  parent_id: string;
  position: number;
  parent?: Episode;
}

export interface GetBookmark {
  [key: string]: string | boolean | undefined;
  id?: string;
  parent_id?: string;
  episodes?: boolean;
  podcasts?: boolean;
}

export interface AddBookmark {
  [key: string]: string | number;
  parent_id: string;
  position: number;
}

export interface RemoveBookmark {
  [key: string]: string | undefined;
  id?: string;
  parent_id?: string;
}

export interface UpdateBookmark {
  [key: string]: string | number | undefined;
  id: string;
  position?: number;
}

export interface Metadata {
  [key: string]: string;
  id: string;
  created_at: string;
  modified_at: string;
  parent_id: string;
  parent_type: string;
  key: string;
  value: string;
}

export interface GetMetadata {
  [key: string]: string | undefined;
  id?: string;
  key?: string;
  parent_id?: string;
}

export interface AddMetadata {
  [key: string]: string;
  parent_id: string;
  parent_type: string;
  key: string;
  value: string;
}

export interface RemoveMetadata {
  [key: string]: string | undefined;
  id?: string;
  parent_id?: string;
}

export interface UpdateMetadata {
  [key: string]: string;
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
