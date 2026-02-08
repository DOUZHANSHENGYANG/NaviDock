import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect, useState } from 'react';
import { SiteItem, Category, Environment, NavState, Theme, Language, PersistedAppData } from '../types';
import { desktopApi } from '../services/desktopApi';

// --- I18n Data ---
const TRANSLATIONS = {
  zh: {
    'nav.workspace': '工作空间',
    'nav.environments': '环境视图',
    'nav.categories': '分类管理',
    'nav.dev': '开发环境',
    'nav.prod': '生产环境',
    'nav.all_apps': '全部应用',
    'nav.add_cat': '新建分类',
    'settings.title': '设置',
    'settings.appearance': '外观',
    'settings.language': '语言',
    'settings.light': '浅色',
    'settings.dark': '深色',
    'settings.system': '跟随系统',
    'settings.data_mgmt': '数据管理',
    'settings.export': '导出配置',
    'settings.import': '导入配置',
    'app.search_placeholder': '搜索服务、标签、分类...',
    'app.add_service': '添加服务',
    'app.no_services': '未找到服务',
    'modal.add_title': '添加新服务',
    'modal.edit_title': '编辑服务',
    'modal.subtitle': '配置元数据',
    'modal.title_label': '标题',
    'modal.category_label': '分类',
    'modal.desc_label': '描述',
    'modal.env_mapping': '环境映射',
    'modal.target_url': '目标地址',
    'modal.auto_fetch': '自动获取',
    'modal.dev_url': '开发环境地址',
    'modal.prod_url': '生产环境地址',
    'modal.tags_label': '标签',
    'modal.tags_placeholder': '输入后按回车...',
    'modal.cancel': '取消',
    'modal.save': '保存服务',
    'modal.delete': '删除',
    'card.open': '打开',
    'cat.system_dev': '系统开发',
    'cat.tools': '常用工具',
    'cat.docs': '文档资料',
    'cat.design': '设计资源',
    'cat.imported': '导入分类',
    'settings.category_mgmt': '分类管理',
    'settings.import_bookmarks': '导入书签',
    'settings.default_import_category': '默认导入分类',
    'settings.import_mode': '导入模式',
    'settings.mode_single': '导入到单一分类',
    'settings.mode_folder': '按书签文件夹自动分组',
    'settings.bookmark_file': '书签文件',
    'settings.select_file': '选择 HTML 文件',
    'settings.no_file': '未选择文件',
    'settings.preview_count': '预览数量',
    'settings.start_import': '开始导入',
    'confirm.delete_cat_items': '该分类下包含 {count} 个网站，确定要删除吗？此操作无法撤销。',
    'confirm.delete_cat_empty': '确定要删除此空分类吗？'
  },
  en: {
    'nav.workspace': 'Workspace',
    'nav.environments': 'Environments',
    'nav.categories': 'Categories',
    'nav.dev': 'Development',
    'nav.prod': 'Production',
    'nav.all_apps': 'All Apps',
    'nav.add_cat': 'New Category',
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.system': 'System',
    'settings.data_mgmt': 'Data Management',
    'settings.export': 'Export Config',
    'settings.import': 'Import Config',
    'app.search_placeholder': 'Search services, tags, categories...',
    'app.add_service': 'Add Service',
    'app.no_services': 'No services found.',
    'modal.add_title': 'Add New Service',
    'modal.edit_title': 'Edit Service',
    'modal.subtitle': 'Configure metadata',
    'modal.title_label': 'Title',
    'modal.category_label': 'Category',
    'modal.desc_label': 'Description',
    'modal.env_mapping': 'Environment Mapping',
    'modal.target_url': 'Target URL',
    'modal.auto_fetch': 'Auto-Fetch',
    'modal.dev_url': 'Development URL',
    'modal.prod_url': 'Production URL',
    'modal.tags_label': 'Tags',
    'modal.tags_placeholder': 'Type and press Enter...',
    'modal.cancel': 'Cancel',
    'modal.save': 'Save Service',
    'modal.delete': 'Delete',
    'card.open': 'Open',
    'cat.system_dev': 'System Dev',
    'cat.tools': 'Tools',
    'cat.docs': 'Docs',
    'cat.design': 'Design',
    'cat.imported': 'Imported',
    'settings.category_mgmt': 'Category Manager',
    'settings.import_bookmarks': 'Import Bookmarks',
    'settings.default_import_category': 'Default Import Category',
    'settings.import_mode': 'Import Mode',
    'settings.mode_single': 'Import into Single Category',
    'settings.mode_folder': 'Group by Bookmark Folder',
    'settings.bookmark_file': 'Bookmark File',
    'settings.select_file': 'Choose HTML File',
    'settings.no_file': 'No file selected',
    'settings.preview_count': 'Preview Count',
    'settings.start_import': 'Start Import',
    'confirm.delete_cat_items': 'This category contains {count} items. Are you sure you want to delete it? This cannot be undone.',
    'confirm.delete_cat_empty': 'Delete this empty category?'
  }
};

// --- Mock Data ---
const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-system-dev', name: 'cat.system_dev', icon: 'Terminal', type: 'system' },
  { id: 'cat-tools', name: 'cat.tools', icon: 'Wrench', type: 'user' },
  { id: 'cat-docs', name: 'cat.docs', icon: 'Book', type: 'user' },
  { id: 'cat-imported', name: 'cat.imported', icon: 'Folder', type: 'user' },
];

const MOCK_SITES: SiteItem[] = [
  {
    id: '1',
    title: 'Jenkins CI',
    description: 'Main build pipeline and CI/CD orchestration.',
    envConfig: { devUrl: 'https://dev-jenkins.company.internal', prodUrl: 'https://jenkins.company.com' },
    categoryId: 'cat-system-dev',
    tags: ['CI/CD', 'Java'],
    status: 'online',
    viewType: 'browser',
  },
  {
    id: '2',
    title: 'Grafana Dash',
    description: 'System metrics, logs and real-time monitoring.',
    envConfig: { devUrl: 'https://dev-grafana.internal', prodUrl: 'https://grafana.company.com' },
    categoryId: 'cat-system-dev',
    tags: ['Monitoring', 'Ops'],
    status: 'online',
    viewType: 'webview',
  },
  {
    id: '3',
    title: 'JSON Formatter',
    description: 'Online JSON validator and formatter.',
    envConfig: { devUrl: '', prodUrl: 'https://jsonformatter.org' },
    categoryId: 'cat-tools',
    tags: ['Utils'],
    status: 'online',
    viewType: 'browser',
  },
  {
    id: '4',
    title: 'React Docs',
    description: 'Official React documentation.',
    envConfig: { devUrl: '', prodUrl: 'https://react.dev' },
    categoryId: 'cat-docs',
    tags: ['Frontend', 'Docs'],
    status: 'online',
    viewType: 'browser',
  }
];

// --- Context & Reducer ---

type Action =
  | { type: 'HYDRATE'; payload: PersistedAppData }
  | { type: 'ADD_SITE'; payload: SiteItem }
  | { type: 'UPDATE_SITE'; payload: { id: string; data: Partial<SiteItem> } }
  | { type: 'DELETE_SITE'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: { id: string; name: string } }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_ENV'; payload: Environment }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string | null }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_IMPORT_CATEGORY'; payload: string };

interface NavContextType extends NavState {
  filteredSites: SiteItem[];
  allTags: string[];
  isHydrated: boolean;
  isDesktopPersistenceEnabled: boolean;
  addSite: (site: SiteItem) => Promise<void>;
  updateSite: (id: string, data: Partial<SiteItem>) => Promise<void>;
  deleteSite: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setEnv: (env: Environment) => Promise<void>;
  setSearch: (query: string) => void;
  setCategory: (id: string | null) => void;
  toggleTag: (tag: string) => void;
  setViewMode: (mode: 'grid' | 'list') => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setImportCategory: (categoryId: string) => Promise<void>;
  exportConfig: () => Promise<void>;
  importConfigFromText: (configText: string) => Promise<void>;
  t: (key: string, params?: Record<string, any>) => string;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

const initialState: NavState = {
  sites: MOCK_SITES,
  categories: MOCK_CATEGORIES,
  environment: 'PROD', // Default to PROD
  searchQuery: '',
  selectedCategoryId: null,
  selectedTags: [],
  viewMode: 'grid',
  theme: 'system',
  language: 'zh',
  importCategoryId: 'cat-imported',
};

const resolveImportCategoryId = (categories: Category[], preferredId?: string) => {
  if (categories.length === 0) {
    return 'cat-imported';
  }

  if (preferredId && categories.some(category => category.id === preferredId)) {
    return preferredId;
  }

  return (
    categories.find(category => category.type === 'user')?.id ||
    categories[0].id
  );
};

function navReducer(state: NavState, action: Action): NavState {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        sites: action.payload.sites,
        categories: action.payload.categories,
        environment: action.payload.environment,
        viewMode: action.payload.viewMode,
        theme: action.payload.theme,
        language: action.payload.language,
        importCategoryId: resolveImportCategoryId(
          action.payload.categories,
          action.payload.importCategoryId,
        ),
        searchQuery: '',
        selectedCategoryId: null,
        selectedTags: [],
      };
    case 'ADD_SITE':
      return { ...state, sites: [...state.sites, action.payload] };
    case 'UPDATE_SITE':
      return {
        ...state,
        sites: state.sites.map(s => s.id === action.payload.id ? { ...s, ...action.payload.data } : s)
      };
    case 'DELETE_SITE':
      return {
         ...state,
         sites: state.sites.filter(s => s.id !== action.payload)
      };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => 
          c.id === action.payload.id ? { ...c, name: action.payload.name } : c
        )
      };
    case 'DELETE_CATEGORY': {
      const nextCategories = state.categories.filter(c => c.id !== action.payload);
      return {
        ...state,
        categories: nextCategories,
        sites: state.sites.filter(s => s.categoryId !== action.payload), // Cascade delete sites? Or keep orphans? Let's cascade based on prompt warning.
        selectedCategoryId: state.selectedCategoryId === action.payload ? null : state.selectedCategoryId,
        importCategoryId:
          state.importCategoryId === action.payload
            ? resolveImportCategoryId(nextCategories)
            : state.importCategoryId,
      };
    }
    case 'SET_ENV':
      return { ...state, environment: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_CATEGORY':
      return { ...state, selectedCategoryId: action.payload, selectedTags: [] };
    case 'TOGGLE_TAG':
      const isSelected = state.selectedTags.includes(action.payload);
      return {
        ...state,
        selectedTags: isSelected
          ? state.selectedTags.filter(t => t !== action.payload)
          : [...state.selectedTags, action.payload]
      };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_IMPORT_CATEGORY':
      return {
        ...state,
        importCategoryId: resolveImportCategoryId(state.categories, action.payload),
      };
    default:
      return state;
  }
}

export const NavProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(navReducer, initialState);
  const [isHydrated, setIsHydrated] = useState(!desktopApi.isEnabled);

  useEffect(() => {
    let active = true;

    const hydrateFromDesktop = async () => {
      if (!desktopApi.isEnabled) {
        setIsHydrated(true);
        return;
      }

      try {
        const persisted = await desktopApi.loadAppData();
        if (!active) return;
        dispatch({ type: 'HYDRATE', payload: persisted });
      } catch (error) {
        console.error('[NavContext] Failed to hydrate from SQLite, fallback to mock data.', error);
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    };

    hydrateFromDesktop();
    return () => {
      active = false;
    };
  }, []);

  // --- Theme Effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (state.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(state.theme);
    }
  }, [state.theme]);

  // --- Helpers ---
  const t = (key: string, params?: Record<string, any>): string => {
    // @ts-ignore
    let text = TRANSLATIONS[state.language][key] || key;
    if (params) {
        Object.keys(params).forEach(k => {
            text = text.replace(`{${k}}`, params[k]);
        });
    }
    return text;
  };

  // --- Getters ---

  const allTags = useMemo(() => {
    const collectTags = (sites: SiteItem[]) => {
      const tags = new Set<string>();
      sites.forEach(site => site.tags.forEach(tag => tags.add(tag)));
      return Array.from(tags).sort();
    };

    if (!state.selectedCategoryId) return collectTags(state.sites);
    const categorySites = state.sites.filter(site => site.categoryId === state.selectedCategoryId);
    return collectTags(categorySites);
  }, [state.sites, state.selectedCategoryId]);

  const filteredSites = useMemo(() => {
    return state.sites.filter(site => {
      // Category Filter (Strict)
      if (state.selectedCategoryId && site.categoryId !== state.selectedCategoryId) {
        return false;
      }
      
      // Search Filter (Fuzzy)
      const query = state.searchQuery.toLowerCase();
      if (query) {
         const category = state.categories.find(c => c.id === site.categoryId);
         const categoryName = category ? t(category.name).toLowerCase() : '';
         
         const matchesSearch =
            site.title.toLowerCase().includes(query) ||
            site.description.toLowerCase().includes(query) ||
            site.tags.some(tag => tag.toLowerCase().includes(query)) ||
            categoryName.includes(query);
        
        if (!matchesSearch) return false;
      }

      // Tag Filter (AND logic)
      if (state.selectedTags.length > 0) {
        const hasAllTags = state.selectedTags.every(tag => site.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [state.sites, state.selectedCategoryId, state.searchQuery, state.selectedTags, state.categories, state.language]);

  // --- Actions ---
  const toPersistedStateSnapshot = (): PersistedAppData => ({
    sites: state.sites,
    categories: state.categories,
    environment: state.environment,
    viewMode: state.viewMode,
    theme: state.theme,
    language: state.language,
    importCategoryId: state.importCategoryId,
  });

  const readPersistedDataFromImport = (raw: string): PersistedAppData => {
    const parsed = JSON.parse(raw);
    const maybeData =
      parsed && typeof parsed === 'object' && 'data' in parsed
        ? (parsed as { data: unknown }).data
        : parsed;

    if (!maybeData || typeof maybeData !== 'object') {
      throw new Error('Invalid import payload.');
    }

    const requiredKeys: Array<keyof PersistedAppData> = [
      'sites',
      'categories',
      'environment',
      'viewMode',
      'theme',
      'language',
    ];

    for (const key of requiredKeys) {
      if (!(key in (maybeData as Record<string, unknown>))) {
        throw new Error(`Missing key in import payload: ${key}`);
      }
    }

    const data = maybeData as PersistedAppData & { importCategoryId?: string };
    return {
      ...data,
      importCategoryId: resolveImportCategoryId(
        data.categories,
        data.importCategoryId,
      ),
    };
  };

  const downloadJson = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const buildExportFilename = () => {
    const formatted = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    return `navidock-config-${formatted}.json`;
  };

  const persistSetting = async (
    key: 'theme' | 'language' | 'environment' | 'viewMode' | 'importCategoryId',
    value: string,
  ) => {
    if (!desktopApi.isEnabled) return;
    try {
      await desktopApi.updateSetting(key, value);
    } catch (error) {
      console.error(`[NavContext] Failed to persist setting (${key}).`, error);
    }
  };

  const addSite = async (site: SiteItem) => {
    if (desktopApi.isEnabled) {
      const created = await desktopApi.createSite(site);
      dispatch({ type: 'ADD_SITE', payload: created });
      return;
    }
    dispatch({ type: 'ADD_SITE', payload: site });
  };

  const updateSite = async (id: string, data: Partial<SiteItem>) => {
    const existing = state.sites.find(s => s.id === id);
    if (!existing) return;

    const mergedSite: SiteItem = {
      ...existing,
      ...data,
      envConfig: {
        ...existing.envConfig,
        ...(data.envConfig || {}),
      },
      tags: data.tags ?? existing.tags,
    };

    if (desktopApi.isEnabled) {
      const updated = await desktopApi.updateSite(mergedSite);
      dispatch({ type: 'UPDATE_SITE', payload: { id, data: updated } });
      return;
    }
    dispatch({ type: 'UPDATE_SITE', payload: { id, data } });
  };

  const deleteSite = async (id: string) => {
    if (desktopApi.isEnabled) {
      await desktopApi.deleteSite(id);
    }
    dispatch({ type: 'DELETE_SITE', payload: id });
  };

  const addCategory = async (name: string) => {
    if (desktopApi.isEnabled) {
      const created = await desktopApi.createCategory(name);
      dispatch({ type: 'ADD_CATEGORY', payload: created });
      return created;
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      icon: 'Folder',
      type: 'user',
    };
    dispatch({ type: 'ADD_CATEGORY', payload: newCat });
    return newCat;
  };

  const updateCategory = async (id: string, name: string) => {
    if (desktopApi.isEnabled) {
      const updated = await desktopApi.updateCategory(id, name);
      dispatch({ type: 'UPDATE_CATEGORY', payload: { id, name: updated.name } });
      return;
    }
    dispatch({ type: 'UPDATE_CATEGORY', payload: { id, name } });
  };

  const deleteCategory = async (id: string) => {
    const nextCategories = state.categories.filter(category => category.id !== id);
    const nextImportCategoryId =
      state.importCategoryId === id
        ? resolveImportCategoryId(nextCategories)
        : state.importCategoryId;

    if (desktopApi.isEnabled) {
      await desktopApi.deleteCategory(id);
    }
    dispatch({ type: 'DELETE_CATEGORY', payload: id });

    if (nextImportCategoryId !== state.importCategoryId) {
      await persistSetting('importCategoryId', nextImportCategoryId);
    }
  };

  const setEnv = async (env: Environment) => {
    dispatch({ type: 'SET_ENV', payload: env });
    await persistSetting('environment', env);
  };
  const setSearch = (query: string) => dispatch({ type: 'SET_SEARCH', payload: query });
  const setCategory = (id: string | null) => dispatch({ type: 'SET_CATEGORY', payload: id });
  const toggleTag = (tag: string) => dispatch({ type: 'TOGGLE_TAG', payload: tag });
  const setViewMode = async (mode: 'grid' | 'list') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    await persistSetting('viewMode', mode);
  };
  const setTheme = async (theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    await persistSetting('theme', theme);
  };
  const setLanguage = async (lang: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    await persistSetting('language', lang);
  };

  const setImportCategory = async (categoryId: string) => {
    const resolvedCategoryId = resolveImportCategoryId(state.categories, categoryId);
    dispatch({ type: 'SET_IMPORT_CATEGORY', payload: resolvedCategoryId });
    await persistSetting('importCategoryId', resolvedCategoryId);
  };

  const exportConfig = async () => {
    const filename = buildExportFilename();

    if (desktopApi.isEnabled) {
      await desktopApi.exportConfigToFile(filename);
      return;
    }

    const configJson = JSON.stringify(
      {
        formatVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: toPersistedStateSnapshot(),
      },
      null,
      2,
    );

    downloadJson(filename, configJson);
  };

  const importConfigFromText = async (configText: string) => {
    const raw = configText.trim();
    if (!raw) {
      throw new Error('Import content is empty.');
    }

    if (desktopApi.isEnabled) {
      const imported = await desktopApi.importConfig(raw);
      dispatch({ type: 'HYDRATE', payload: imported });
      return;
    }

    const parsed = readPersistedDataFromImport(raw);
    dispatch({ type: 'HYDRATE', payload: parsed });
  };

  return (
    <NavContext.Provider value={{ 
        ...state, 
        filteredSites, 
        allTags, 
        isHydrated,
        isDesktopPersistenceEnabled: desktopApi.isEnabled,
        addSite, 
        updateSite, 
        deleteSite,
        addCategory,
        updateCategory,
        deleteCategory,
        setEnv, 
        setSearch, 
        setCategory, 
        toggleTag, 
        setViewMode, 
        setTheme, 
        setLanguage, 
        setImportCategory,
        exportConfig,
        importConfigFromText,
        t 
    }}>
      {children}
    </NavContext.Provider>
  );
};

export const useNavStore = () => {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNavStore must be used within a NavProvider');
  }
  return context;
};
