import React, { useEffect, useRef, useState } from 'react';
import { useNavStore } from './context/NavContext';
import Sidebar from './components/Sidebar';
import SiteCard from './components/SiteCard';
import AddSiteModal from './components/AddSiteModal';
import SettingsModal from './components/SettingsModal';
import { SiteItem } from './types';
import { useToast } from './context/ToastContext';
import { desktopApi } from './services/desktopApi';
import { Search, LayoutGrid, List as ListIcon, Plus, SlidersHorizontal, PackageOpen, Rocket, TestTube2, Pencil, ArrowLeft, ArrowRight, Maximize2, Minimize2, ExternalLink, X, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

const App: React.FC = () => {
  const { showToast } = useToast();
  const { 
    filteredSites, 
    allTags, 
    selectedTags, 
    toggleTag, 
    setSearch, 
    searchQuery, 
    environment,
    setEnv,
    viewMode,
    setViewMode,
    addSite,
    selectedCategoryId,
    language,
    isHydrated,
    t
  } = useNavStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [browser, setBrowser] = useState<{
    url: string;
    title: string;
    isFullscreen: boolean;
    reloadKey: number;
  } | null>(null);
  const [browserAddress, setBrowserAddress] = useState('');
  const [browserZoom, setBrowserZoom] = useState(1);
  const [browserHistory, setBrowserHistory] = useState<{
    stack: string[];
    index: number;
  }>({
    stack: [],
    index: -1,
  });
  const browserFrameRef = useRef<HTMLIFrameElement | null>(null);
  const browserContainerRef = useRef<HTMLDivElement | null>(null);
  const browserViewportRef = useRef<HTMLDivElement | null>(null);
  const browserActionButtonClass =
    'p-2 rounded-xl border border-white/55 dark:border-white/15 bg-white/70 dark:bg-black/35 text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 hover:text-brand-DEFAULT disabled:opacity-45 disabled:cursor-not-allowed transition-all shadow-sm';

  const handleEditSite = (site: SiteItem) => {
    setEditingSite(site);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSite(null);
  }

  const resolveSiteUrl = (site: SiteItem) => {
    const isSystemDev = site.categoryId === 'cat-system-dev';
    return isSystemDev
      ? (environment === 'DEV' ? site.envConfig.devUrl : site.envConfig.prodUrl)
      : site.envConfig.prodUrl;
  };

  const normalizeBrowserUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const deriveBrowserTitle = (url: string, fallback = 'Embedded Browser') => {
    try {
      return new URL(url).host || fallback;
    } catch {
      return fallback;
    }
  };

  const pushBrowserHistory = (rawUrl: string) => {
    const normalizedUrl = normalizeBrowserUrl(rawUrl);
    if (!normalizedUrl) return;

    setBrowserHistory(prev => {
      const current = prev.stack[prev.index];
      if (current === normalizedUrl) return prev;

      const nextStack = prev.stack.slice(0, prev.index + 1);
      nextStack.push(normalizedUrl);
      return {
        stack: nextStack,
        index: nextStack.length - 1,
      };
    });
  };

  const canBrowserGoBack = browserHistory.index > 0;
  const canBrowserGoForward =
    browserHistory.index >= 0 && browserHistory.index < browserHistory.stack.length - 1;

  const clampZoom = (value: number) => {
    const bounded = Math.min(1.6, Math.max(0.45, value));
    return Number(bounded.toFixed(2));
  };

  const calculateFitZoom = () => {
    const viewportWidth = browserViewportRef.current?.clientWidth ?? 0;
    if (!viewportWidth) return 1;

    let targetWidth = 1366;
    try {
      const frameDocument = browserFrameRef.current?.contentDocument;
      const contentWidth =
        frameDocument?.documentElement?.scrollWidth || frameDocument?.body?.scrollWidth;
      if (contentWidth && contentWidth > 0) {
        targetWidth = contentWidth;
      }
    } catch {
      // Cross-origin iframes cannot be introspected; fallback width remains.
    }

    return clampZoom(viewportWidth / targetWidth);
  };

  const handleBrowserFitZoom = () => {
    setBrowserZoom(calculateFitZoom());
  };

  const handleBrowserZoomIn = () => {
    setBrowserZoom(prev => clampZoom(prev + 0.1));
  };

  const handleBrowserZoomOut = () => {
    setBrowserZoom(prev => clampZoom(prev - 0.1));
  };

  const handleBrowserZoomReset = () => {
    setBrowserZoom(1);
  };

  const syncBrowserLocation = () => {
    const frame = browserFrameRef.current;
    if (!frame) return;

    try {
      const currentUrl = frame.contentWindow?.location.href?.trim();
      const currentTitle = frame.contentDocument?.title?.trim();
      if (!currentUrl) return;

      setBrowser(prev =>
        prev
          ? {
              ...prev,
              url: currentUrl,
              title: currentTitle || prev.title,
            }
          : prev,
      );
      setBrowserAddress(currentUrl);
      pushBrowserHistory(currentUrl);
    } catch {
      // Cross-origin pages may block location/title introspection; keep current state.
    }
  };

  const navigateEmbeddedUrl = (raw: string) => {
    const nextUrl = normalizeBrowserUrl(raw);
    if (!nextUrl) {
      showToast({
        variant: 'warning',
        title: language === 'zh' ? '需要网址' : 'URL Required',
        message: language === 'zh' ? '请输入可访问的网址。' : 'Please enter a valid URL.',
      });
      return;
    }
    if (!browser) return;

    setBrowser(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        url: nextUrl,
        title: deriveBrowserTitle(nextUrl, prev.title),
      };
    });
    setBrowserAddress(nextUrl);
    setBrowserZoom(1);
    pushBrowserHistory(nextUrl);
  };

  const openSite = async (site: SiteItem) => {
    const rawUrl = resolveSiteUrl(site)?.trim();
    const url = normalizeBrowserUrl(rawUrl || '');

    if (!url) {
      handleEditSite(site);
      return;
    }

    setBrowser({
      url,
      title: site.title || deriveBrowserTitle(url),
      isFullscreen: false,
      reloadKey: Date.now(),
    });
    setBrowserAddress(url);
    setBrowserZoom(1);
    setBrowserHistory({
      stack: [url],
      index: 0,
    });
  };

  const handleBrowserBack = () => {
    if (!canBrowserGoBack) {
      showToast({
        variant: 'warning',
        title: language === 'zh' ? '无法返回' : 'Cannot Go Back',
        message:
          language === 'zh'
            ? '当前会话中没有上一页。'
            : 'No previous page is available in current session.',
      });
      return;
    }

    const targetIndex = browserHistory.index - 1;
    const targetUrl = browserHistory.stack[targetIndex];
    if (!targetUrl) return;

    setBrowser(prev =>
      prev
        ? {
            ...prev,
            url: targetUrl,
            title: deriveBrowserTitle(targetUrl, prev.title),
          }
        : prev,
    );
    setBrowserAddress(targetUrl);
    setBrowserZoom(1);
    setBrowserHistory(prev => ({ ...prev, index: targetIndex }));
  };

  const handleBrowserForward = () => {
    if (!canBrowserGoForward) {
      showToast({
        variant: 'warning',
        title: language === 'zh' ? '无法前进' : 'Cannot Go Forward',
        message:
          language === 'zh'
            ? '当前会话中没有下一页。'
            : 'No forward page is available in current session.',
      });
      return;
    }

    const targetIndex = browserHistory.index + 1;
    const targetUrl = browserHistory.stack[targetIndex];
    if (!targetUrl) return;

    setBrowser(prev =>
      prev
        ? {
            ...prev,
            url: targetUrl,
            title: deriveBrowserTitle(targetUrl, prev.title),
          }
        : prev,
    );
    setBrowserAddress(targetUrl);
    setBrowserZoom(1);
    setBrowserHistory(prev => ({ ...prev, index: targetIndex }));
  };

  const handleBrowserRefresh = () => {
    setBrowser(prev => (prev ? { ...prev, reloadKey: Date.now() } : prev));
    window.setTimeout(syncBrowserLocation, 300);
  };

  const handleBrowserClose = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setBrowser(null);
    setBrowserAddress('');
    setBrowserZoom(1);
    setBrowserHistory({
      stack: [],
      index: -1,
    });
  };

  const handleBrowserOpenExternal = async () => {
    const targetUrl = normalizeBrowserUrl(browserAddress || browser?.url || '');
    if (!targetUrl) return;
    try {
      if (desktopApi.isEnabled) {
        await desktopApi.openUrl(targetUrl);
        return;
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('[App] Failed to open external URL.', error);
      showToast({
        variant: 'error',
        title: language === 'zh' ? '打开失败' : 'Open Failed',
        message: language === 'zh' ? '无法打开外部浏览器。' : 'Unable to open external browser.',
      });
    }
  };

  const handleBrowserFullscreen = async () => {
    if (!browserContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await browserContainerRef.current.requestFullscreen();
        setBrowser(prev => (prev ? { ...prev, isFullscreen: true } : prev));
        return;
      }
      await document.exitFullscreen();
      setBrowser(prev => (prev ? { ...prev, isFullscreen: false } : prev));
    } catch (error) {
      console.error('[App] Fullscreen toggle failed.', error);
      showToast({
        variant: 'warning',
        title: language === 'zh' ? '全屏不可用' : 'Fullscreen Unavailable',
        message: language === 'zh' ? '当前环境不支持全屏。' : 'Fullscreen is not available in current environment.',
      });
    }
  };

  useEffect(() => {
    const handler = () => {
      const isFull = Boolean(document.fullscreenElement);
      setBrowser(prev => (prev ? { ...prev, isFullscreen: isFull } : prev));
    };

    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!browser) return;
    const timer = window.setTimeout(() => {
      handleBrowserFitZoom();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [browser?.url, browser?.reloadKey]);

  useEffect(() => {
    if (!browser) return;

    const onKeydown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x';
      if (!isShortcut) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        Boolean(target?.isContentEditable);

      if (isEditable) return;

      event.preventDefault();
      handleBrowserFitZoom();
      showToast({
        variant: 'info',
        title: language === 'zh' ? '已自动适配' : 'Auto Fit Applied',
        message:
          language === 'zh'
            ? '已按内嵌面板宽度自动缩放。'
            : 'Embedded page zoom was fit to panel width.',
        durationMs: 1600,
      });
    };

    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [browser, language, showToast]);

  // Handle click on list item: Click to open, Ctrl/Cmd + Click to edit
  const handleListRowClick = (e: React.MouseEvent, site: SiteItem) => {
    if (e.ctrlKey || e.metaKey) {
      handleEditSite(site);
      return;
    }
    void openSite(site);
  };

  // Check if we are in the "System Development" category (id: cat-system-dev)
  const isSystemDevCategory = selectedCategoryId === 'cat-system-dev';

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-300">
        <div className="glass-panel rounded-2xl px-6 py-4 font-semibold">Initializing workspace...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen transition-colors duration-500 font-sans selection:bg-brand-DEFAULT/30 relative overflow-hidden">
      
      {/* --- Liquid Background Blobs (Minty/Fresh Theme) --- */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          {/* Top Left: Emerald */}
          <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-emerald-200/40 dark:bg-emerald-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[90px] animate-blob"></div>
          {/* Top Right: Teal/Cyan */}
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-200/40 dark:bg-cyan-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[90px] animate-blob animation-delay-2000"></div>
          {/* Bottom Center: Lime/Blue mix */}
          <div className="absolute -bottom-32 left-[20%] w-[60vw] h-[60vw] bg-sky-200/40 dark:bg-teal-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[90px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar (Glass) */}
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
      
      {/* Main Content */}
      <main className="ml-64 flex-1 flex flex-col h-screen relative z-0">
        
        {/* Header - Glassy & Floating */}
        <header className="px-8 py-6 z-20">
            <div className="flex flex-col gap-6">
                
                {/* Top Row: Search & Actions */}
                <div className="flex items-center justify-between gap-4">
                    
                    {/* Environment Toggle */}
                    {isSystemDevCategory ? (
                         <div className="flex glass-panel p-1 rounded-2xl shadow-sm">
                            <button
                                onClick={() => { void setEnv('PROD'); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    environment === 'PROD' 
                                    ? 'bg-white dark:bg-white/10 text-orange-500 shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                }`}
                            >
                                <Rocket size={14} /> {t('nav.prod')}
                            </button>
                            <button
                                onClick={() => { void setEnv('DEV'); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    environment === 'DEV' 
                                    ? 'bg-white dark:bg-white/10 text-brand-DEFAULT shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                }`}
                            >
                                <TestTube2 size={14} /> {t('nav.dev')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 font-['Plus_Jakarta_Sans']">
                            Board
                        </div>
                    )}

                    {/* Search - Glass Input */}
                    <div className="relative flex-1 max-w-xl group mx-auto">
                         <div className="absolute inset-0 bg-white/40 dark:bg-black/20 rounded-full blur-sm"></div>
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-DEFAULT transition-colors z-10" size={20} />
                         <input 
                            type="text" 
                            placeholder={t('app.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearch(e.target.value)}
                            className="relative z-10 w-full bg-white/50 dark:bg-black/20 border border-white/60 dark:border-white/10 rounded-full pl-12 pr-12 py-3.5 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/30 focus:bg-white/70 dark:focus:bg-black/40 transition-all shadow-sm backdrop-blur-sm"
                         />
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                            <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold text-slate-500 bg-white/60 dark:bg-white/10 rounded-lg border border-white/20">⌘K</kbd>
                        </div>
                    </div>

                    {/* Right Actions - Removed User Avatar */}
                    <div className="flex items-center gap-4">
                         
                         <div className="flex items-center glass-panel p-1 rounded-xl shadow-sm">
                            <button 
                                onClick={() => { void setViewMode('grid'); }} 
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-brand-DEFAULT shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => { void setViewMode('list'); }} 
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-brand-DEFAULT shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ListIcon size={18} />
                            </button>
                         </div>
                         
                         <button 
                            onClick={() => { setEditingSite(null); setIsModalOpen(true); }}
                            className="group relative flex items-center gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                         >
                            <span className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-colors"></span>
                            <span className="relative w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                              <Plus size={16} />
                            </span>
                            <span className="relative hidden sm:inline">{t('app.add_service')}</span>
                         </button>
                    </div>
                </div>

                {/* Bottom Row: Filters */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest px-2 border-r border-slate-200/50 dark:border-white/10 pr-4">
                        <SlidersHorizontal size={14} />
                        <span>Tags</span>
                     </div>
                     {allTags.length === 0 ? (
                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2">
                          {selectedCategoryId
                            ? (language === 'zh' ? '当前分类暂无标签' : 'No tags in current category')
                            : (language === 'zh' ? '暂无标签数据' : 'No tags available')}
                        </div>
                     ) : (
                        allTags.map((tag, idx) => {
                          const isSelected = selectedTags.includes(tag);
                          const colors = [
                            'border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20',
                            'border-orange-200 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
                            'border-amber-200 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
                            'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
                            'border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
                            'border-violet-200 bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
                          ];
                          const colorClass = colors[idx % colors.length];

                          return (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border backdrop-blur-md
                              ${isSelected
                                ? `${colorClass} shadow-sm`
                                : 'bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/10'}
                              `}
                            >
                              {isSelected && <span className="mr-1.5">●</span>}
                              {tag}
                            </button>
                          );
                        })
                     )}
                </div>
            </div>
        </header>

        {/* Content + Embedded Browser */}
        <div className={`flex-1 min-h-0 ${browser ? 'flex gap-4 px-8 pb-6' : ''}`}>
          <div className={`${browser ? 'flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-1 pb-16' : 'flex-1 overflow-y-auto px-8 pb-20 custom-scrollbar'}`}>
            {filteredSites.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <div className="w-24 h-24 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/50 dark:border-white/10 shadow-lg">
                  <PackageOpen size={40} className="text-slate-300 dark:text-slate-500" />
                </div>
                <p className="font-bold text-xl text-slate-400 dark:text-slate-600">{t('app.no_services')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className={`grid gap-6 animate-fade-in-up ${browser ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
                {filteredSites.map(site => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    currentEnv={environment}
                    onEdit={handleEditSite}
                    onOpen={() => { void openSite(site); }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                {filteredSites.map(site => (
                  <div
                    key={site.id}
                    onClick={(e) => handleListRowClick(e, site)}
                    className="glass-card rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer group hover:bg-white/60 dark:hover:bg-white/10"
                    title="Click to open, Ctrl + Click to edit"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-brand-DEFAULT transition-colors shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{site.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{site.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex gap-2">
                        {site.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] px-2.5 py-1 rounded-md bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold backdrop-blur-sm">{t}</span>
                        ))}
                      </div>
                      {site.categoryId === 'cat-system-dev' ? (
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md ${site.status === 'online' ? 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100/60 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                          {site.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider bg-gray-100/60 dark:bg-white/5 text-slate-400">
                          LINK
                        </span>
                      )}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditSite(site);
                        }}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-brand-DEFAULT hover:bg-white/70 dark:hover:bg-white/10"
                        title="Edit service"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {browser && (
            <section
              ref={browserContainerRef}
              className="w-[58%] min-w-[560px] max-w-[1240px] h-full rounded-[28px] border border-white/50 dark:border-white/10 bg-white/75 dark:bg-black/45 backdrop-blur-xl shadow-[0_24px_50px_-28px_rgba(15,23,42,0.75)] overflow-hidden flex flex-col"
            >
              <div className="px-4 py-3 border-b border-white/60 dark:border-white/10 bg-gradient-to-r from-indigo-50/80 via-cyan-50/80 to-emerald-50/80 dark:from-slate-950/85 dark:via-cyan-950/45 dark:to-emerald-950/45 flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBrowserBack}
                    disabled={!canBrowserGoBack}
                    className={browserActionButtonClass}
                    title={
                      canBrowserGoBack
                        ? (language === 'zh' ? '返回' : 'Back')
                        : (language === 'zh' ? '当前会话没有上一页' : 'No previous page in this session')
                    }
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    onClick={handleBrowserForward}
                    disabled={!canBrowserGoForward}
                    className={browserActionButtonClass}
                    title={
                      canBrowserGoForward
                        ? (language === 'zh' ? '前进' : 'Forward')
                        : (language === 'zh' ? '当前会话没有下一页' : 'No forward page in this session')
                    }
                  >
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={handleBrowserRefresh}
                    className={browserActionButtonClass}
                    title={language === 'zh' ? '刷新' : 'Refresh'}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>

                <div className="min-w-0 flex-1 px-2">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-100 truncate mb-1">
                    {browser.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={language === 'zh' ? '输入网址并回车' : 'Enter URL and press Enter'}
                      value={browserAddress}
                      onChange={event => setBrowserAddress(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          navigateEmbeddedUrl(browserAddress);
                        }
                      }}
                      className="w-full rounded-lg border border-white/70 dark:border-white/10 bg-white/75 dark:bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/30"
                    />
                    <button
                      onClick={() => navigateEmbeddedUrl(browserAddress)}
                      className="px-2.5 py-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-500/35 bg-gradient-to-r from-emerald-100/80 to-cyan-100/80 dark:from-emerald-500/20 dark:to-cyan-500/20 text-emerald-700 dark:text-emerald-200 text-[11px] font-black hover:brightness-110 transition-all shadow-sm"
                    >
                      {language === 'zh' ? '前往' : 'Go'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl border border-white/60 dark:border-white/15 bg-white/65 dark:bg-black/35 shadow-sm">
                    <button
                      onClick={handleBrowserZoomOut}
                      className={browserActionButtonClass}
                      title={language === 'zh' ? '缩小' : 'Zoom out'}
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      onClick={handleBrowserFitZoom}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide text-emerald-700 dark:text-emerald-200 bg-gradient-to-r from-emerald-100/80 to-cyan-100/80 dark:from-emerald-500/25 dark:to-cyan-500/25 border border-emerald-200/70 dark:border-emerald-500/30"
                      title={language === 'zh' ? '适配宽度' : 'Fit width'}
                    >
                      {language === 'zh' ? '适配' : 'FIT'}
                    </button>
                    <button
                      onClick={handleBrowserZoomReset}
                      className="px-2 py-1 rounded-lg text-[10px] font-black tracking-wide text-slate-700 dark:text-slate-200 bg-white/75 dark:bg-black/35 border border-white/60 dark:border-white/15 hover:bg-white dark:hover:bg-white/10 transition-colors"
                      title={language === 'zh' ? '重置缩放' : 'Reset zoom'}
                    >
                      {Math.round(browserZoom * 100)}%
                    </button>
                    <button
                      onClick={handleBrowserZoomIn}
                      className={browserActionButtonClass}
                      title={language === 'zh' ? '放大' : 'Zoom in'}
                    >
                      <ZoomIn size={14} />
                    </button>
                    <kbd className="px-2 py-1 rounded-lg text-[10px] font-black tracking-wide text-slate-500 dark:text-slate-300 bg-white/70 dark:bg-black/35 border border-white/55 dark:border-white/15">
                      Ctrl+X
                    </kbd>
                  </div>

                  <button
                    onClick={() => { void handleBrowserOpenExternal(); }}
                    className={browserActionButtonClass}
                    title={language === 'zh' ? '外部浏览器打开' : 'Open externally'}
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={() => { void handleBrowserFullscreen(); }}
                    className={browserActionButtonClass}
                    title={browser.isFullscreen ? (language === 'zh' ? '退出全屏' : 'Exit fullscreen') : (language === 'zh' ? '全屏' : 'Fullscreen')}
                  >
                    {browser.isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    onClick={() => { void handleBrowserClose(); }}
                    className="p-2 rounded-xl border border-white/55 dark:border-white/15 bg-white/70 dark:bg-black/35 text-slate-500 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all shadow-sm"
                    title={language === 'zh' ? '关闭内嵌浏览器' : 'Close embedded browser'}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div ref={browserViewportRef} className="flex-1 bg-white dark:bg-slate-950 overflow-auto">
                <div
                  className="origin-top-left"
                  style={{
                    width: `${100 / browserZoom}%`,
                    height: `${100 / browserZoom}%`,
                    transform: `scale(${browserZoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <iframe
                    key={browser.reloadKey}
                    ref={browserFrameRef}
                    src={browser.url}
                    title={browser.title}
                    className="w-full h-full border-0 bg-white"
                    onLoad={() => {
                      syncBrowserLocation();
                      window.setTimeout(() => {
                        handleBrowserFitZoom();
                      }, 80);
                    }}
                  />
                </div>
              </div>
            </section>
          )}
        </div>

      </main>

      {/* Modals */}
      <AddSiteModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={addSite}
        initialData={editingSite}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default App;
