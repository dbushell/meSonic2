export interface SettingStore {
  offline: boolean;
  rate: string;
  skip: number;
}

export interface PlayStore {
  id: string;
  type: 'song' | 'episode';
}

export interface OfflineStore {
  db: IDBDatabase | null;
  cached: IDBValidKey[];
  downloads: {[key: string]: OfflineDownload};
}

export interface OfflineDownload {
  controller: AbortController;
  length: number;
  received: number;
  progress: number;
}

export interface AddOffline {
  id: string;
  url: URL;
}
