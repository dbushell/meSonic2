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
  cached: string[];
  downloads: {[key: string]: OfflineDownload};
  quota: number;
  usage: number;
}

export interface OfflineDownload {
  contentLength: number;
  contentSize: number;
  progress: number;
}

export interface AddOffline {
  id: string;
  url: URL;
}
