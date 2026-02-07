export type Environment = 'DEV' | 'PROD';
export type ViewType = 'webview' | 'browser';
export type SiteStatus = 'online' | 'offline' | 'pending';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh' | 'en';

export interface EnvConfig {
  devUrl: string;
  prodUrl: string;
}

export interface SiteItem {
  id: string;
  title: string;
  description: string;
  icon?: string; // URL or Lucide icon name placeholder
  envConfig: EnvConfig;
  categoryId: string;
  tags: string[];
  status: SiteStatus;
  viewType: ViewType;
}

export interface Category {
  id: string;
  name: string; // Translation key or raw string
  icon: string;
  type: 'system' | 'user'; // Distinguish between built-in environments and user categories
}

export interface NavState {
  sites: SiteItem[];
  categories: Category[];
  environment: Environment; // Now controlled by sidebar selection
  searchQuery: string;
  selectedCategoryId: string | null; // For user categories
  selectedTags: string[];
  viewMode: 'grid' | 'list';
  theme: Theme;
  language: Language;
}

export interface PersistedAppData {
  sites: SiteItem[];
  categories: Category[];
  environment: Environment;
  viewMode: 'grid' | 'list';
  theme: Theme;
  language: Language;
}
