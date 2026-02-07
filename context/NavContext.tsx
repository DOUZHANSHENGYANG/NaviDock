import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { SiteItem, Category, Environment, NavState, Theme, Language } from '../types';

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
    'confirm.delete_cat_items': 'This category contains {count} items. Are you sure you want to delete it? This cannot be undone.',
    'confirm.delete_cat_empty': 'Delete this empty category?'
  }
};

// --- Mock Data ---
const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-system-dev', name: 'cat.system_dev', icon: 'Terminal', type: 'system' },
  { id: 'cat-tools', name: 'cat.tools', icon: 'Wrench', type: 'user' },
  { id: 'cat-docs', name: 'cat.docs', icon: 'Book', type: 'user' },
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
  | { type: 'SET_LANGUAGE'; payload: Language };

interface NavContextType extends NavState {
  filteredSites: SiteItem[];
  allTags: string[];
  addSite: (site: SiteItem) => void;
  updateSite: (id: string, data: Partial<SiteItem>) => void;
  deleteSite: (id: string) => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  setEnv: (env: Environment) => void;
  setSearch: (query: string) => void;
  setCategory: (id: string | null) => void;
  toggleTag: (tag: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
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
};

function navReducer(state: NavState, action: Action): NavState {
  switch (action.type) {
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
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
        sites: state.sites.filter(s => s.categoryId !== action.payload), // Cascade delete sites? Or keep orphans? Let's cascade based on prompt warning.
        selectedCategoryId: state.selectedCategoryId === action.payload ? null : state.selectedCategoryId
      };
    case 'SET_ENV':
      return { ...state, environment: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_CATEGORY':
      return { ...state, selectedCategoryId: action.payload };
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
    default:
      return state;
  }
}

export const NavProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(navReducer, initialState);

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
    const tags = new Set<string>();
    state.sites.forEach(site => site.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [state.sites]);

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

  const addSite = (site: SiteItem) => dispatch({ type: 'ADD_SITE', payload: site });
  const updateSite = (id: string, data: Partial<SiteItem>) => dispatch({ type: 'UPDATE_SITE', payload: { id, data } });
  const deleteSite = (id: string) => dispatch({ type: 'DELETE_SITE', payload: id });
  
  const addCategory = (name: string) => {
    const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: name,
        icon: 'Folder',
        type: 'user'
    };
    dispatch({ type: 'ADD_CATEGORY', payload: newCat });
  }
  const updateCategory = (id: string, name: string) => dispatch({ type: 'UPDATE_CATEGORY', payload: { id, name } });
  const deleteCategory = (id: string) => dispatch({ type: 'DELETE_CATEGORY', payload: id });

  const setEnv = (env: Environment) => dispatch({ type: 'SET_ENV', payload: env });
  const setSearch = (query: string) => dispatch({ type: 'SET_SEARCH', payload: query });
  const setCategory = (id: string | null) => dispatch({ type: 'SET_CATEGORY', payload: id });
  const toggleTag = (tag: string) => dispatch({ type: 'TOGGLE_TAG', payload: tag });
  const setViewMode = (mode: 'grid' | 'list') => dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  const setTheme = (theme: Theme) => dispatch({ type: 'SET_THEME', payload: theme });
  const setLanguage = (lang: Language) => dispatch({ type: 'SET_LANGUAGE', payload: lang });

  return (
    <NavContext.Provider value={{ 
        ...state, 
        filteredSites, 
        allTags, 
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