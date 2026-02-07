import { invoke } from '@tauri-apps/api/core';
import { Category, PersistedAppData, SiteItem } from '../types';

export type AppSettingKey = 'theme' | 'language' | 'environment' | 'viewMode';

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
};
