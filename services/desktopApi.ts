import { invoke } from '@tauri-apps/api/core';
import { Category, PersistedAppData, SiteItem } from '../types';

export type AppSettingKey = 'theme' | 'language' | 'environment' | 'viewMode' | 'importCategoryId';

export interface UrlMetadata {
  title?: string | null;
  description?: string | null;
}

const hasTauriRuntime = () =>
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

async function callCommand<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  if (!hasTauriRuntime()) {
    throw new Error('Tauri runtime unavailable in current environment.');
  }
  return invoke<T>(command, payload);
}

export const desktopApi = {
  isEnabled: hasTauriRuntime(),

  loadAppData: (): Promise<PersistedAppData> => callCommand<PersistedAppData>('load_app_data'),

  createSite: (site: SiteItem): Promise<SiteItem> => callCommand<SiteItem>('create_site', { site }),

  updateSite: (site: SiteItem): Promise<SiteItem> => callCommand<SiteItem>('update_site', { site }),

  deleteSite: (id: string): Promise<void> => callCommand<void>('delete_site', { id }),

  createCategory: (name: string): Promise<Category> =>
    callCommand<Category>('create_category', { name }),

  updateCategory: (id: string, name: string): Promise<Category> =>
    callCommand<Category>('update_category', { id, name }),

  deleteCategory: (id: string): Promise<void> => callCommand<void>('delete_category', { id }),

  updateSetting: (key: AppSettingKey, value: string): Promise<void> =>
    callCommand<void>('update_setting', { key, value }),

  exportConfig: (): Promise<string> => callCommand<string>('export_config'),

  exportConfigToFile: (suggestedFilename?: string): Promise<string | null> =>
    callCommand<string | null>('export_config_to_file', { suggestedFilename }),

  openUrl: (url: string): Promise<void> => callCommand<void>('open_url', { url }),

  openSiteWindow: (url: string, title?: string): Promise<void> =>
    callCommand<void>('open_site_window', { url, title }),

  fetchUrlMetadata: (url: string): Promise<UrlMetadata> =>
    callCommand<UrlMetadata>('fetch_url_metadata', { url }),

  importConfig: (configJson: string): Promise<PersistedAppData> =>
    callCommand<PersistedAppData>('import_config', { configJson }),
};
