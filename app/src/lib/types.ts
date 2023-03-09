export interface SettingStore {
  [key: string]: string | boolean;
  rate: string;
  offline: boolean;
}

export interface OfflineDownload {
  controller: AbortController;
  length: number;
  received: number;
  progress: number;
}

export interface OfflineStore {
  db: IDBDatabase | null;
  cached: IDBValidKey[];
  downloads: {[key: string]: OfflineDownload};
}

export interface AddOffline {
  id: string;
  url: URL;
}
