import React, { useEffect, useState } from 'react';
import { SiteItem, Environment } from '../types';
import { Globe, Layout, Server, Database, Cloud, Edit2, Trash2, ArrowUpRight } from 'lucide-react';
import { useNavStore } from '../context/NavContext';
import { useToast } from '../context/ToastContext';

interface SiteCardProps {
  site: SiteItem;
  currentEnv: Environment;
  onEdit: (site: SiteItem) => void;
  onOpen: () => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, currentEnv, onEdit, onOpen }) => {
  const { deleteSite, language } = useNavStore();
  const { showToast } = useToast();
  const [isDeleteArmed, setIsDeleteArmed] = useState(false);
  const [iconLoadFailed, setIconLoadFailed] = useState(false);
  const [iconTryFallback, setIconTryFallback] = useState(false);

  useEffect(() => {
    if (!isDeleteArmed) return;
    const timer = window.setTimeout(() => setIsDeleteArmed(false), 2600);
    return () => window.clearTimeout(timer);
  }, [isDeleteArmed]);

  const isSystemDev = site.categoryId === 'cat-system-dev';
  const activeUrl = isSystemDev
    ? (currentEnv === 'DEV' ? site.envConfig.devUrl : site.envConfig.prodUrl)
    : site.envConfig.prodUrl;

  useEffect(() => {
    setIconLoadFailed(false);
    setIconTryFallback(false);
  }, [site.icon, site.envConfig.prodUrl, site.envConfig.devUrl, currentEnv]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]';
      case 'offline':
        return 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.55)]';
      case 'pending':
        return 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]';
      default:
        return 'bg-slate-400';
    }
  };

  const getCardTheme = (text: string) => {
    const themes = [
      {
        panel: 'from-fuchsia-500/18 via-purple-500/12 to-cyan-500/18 dark:from-fuchsia-500/28 dark:via-purple-500/22 dark:to-cyan-500/28',
        icon: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-200 border-fuchsia-300/50 dark:border-fuchsia-500/30',
        chip: 'bg-fuchsia-100/80 dark:bg-fuchsia-900/35 text-fuchsia-700 dark:text-fuchsia-200',
      },
      {
        panel: 'from-cyan-500/18 via-sky-500/12 to-emerald-500/18 dark:from-cyan-500/28 dark:via-sky-500/22 dark:to-emerald-500/28',
        icon: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 border-cyan-300/50 dark:border-cyan-500/30',
        chip: 'bg-cyan-100/80 dark:bg-cyan-900/35 text-cyan-700 dark:text-cyan-200',
      },
      {
        panel: 'from-amber-500/18 via-orange-500/12 to-rose-500/18 dark:from-amber-500/28 dark:via-orange-500/22 dark:to-rose-500/28',
        icon: 'bg-orange-500/15 text-orange-700 dark:text-orange-200 border-orange-300/50 dark:border-orange-500/30',
        chip: 'bg-orange-100/80 dark:bg-orange-900/35 text-orange-700 dark:text-orange-200',
      },
    ];

    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = text.charCodeAt(index) + ((hash << 5) - hash);
    }
    return themes[Math.abs(hash) % themes.length];
  };

  const theme = getCardTheme(site.title);

  const renderIcon = () => {
    const size = 20;
    const lowerTitle = site.title.toLowerCase();

    if (lowerTitle.includes('git') || lowerTitle.includes('code')) return <Layout size={size} />;
    if (lowerTitle.includes('data') || lowerTitle.includes('sql') || lowerTitle.includes('grafana')) return <Database size={size} />;
    if (lowerTitle.includes('aws') || lowerTitle.includes('cloud')) return <Cloud size={size} />;
    if (lowerTitle.includes('jenkins') || lowerTitle.includes('ci')) return <Server size={size} />;
    return <Globe size={size} />;
  };

  const resolveFaviconByUrl = (url: string) => {
    try {
      const { hostname } = new URL(url);
      if (!hostname) return '';
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
    } catch {
      return '';
    }
  };

  const storedIcon = site.icon?.trim() || '';
  const fallbackIconByUrl = resolveFaviconByUrl(activeUrl || site.envConfig.prodUrl || site.envConfig.devUrl || '');
  const iconSrc = iconLoadFailed
    ? ''
    : (iconTryFallback ? fallbackIconByUrl : (storedIcon || fallbackIconByUrl));

  const handleIconLoadError = () => {
    if (!iconTryFallback && storedIcon && fallbackIconByUrl && storedIcon !== fallbackIconByUrl) {
      setIconTryFallback(true);
      return;
    }
    setIconLoadFailed(true);
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isDeleteArmed) {
      setIsDeleteArmed(true);
      showToast({
        variant: 'warning',
        title: language === 'zh' ? '再次点击确认删除' : 'Click Again to Confirm',
        message:
          language === 'zh'
            ? `将删除服务「${site.title}」。`
            : `Service "${site.title}" will be deleted.`,
        durationMs: 2600,
      });
      return;
    }

    await deleteSite(site.id);
    setIsDeleteArmed(false);
    showToast({
      variant: 'success',
      title: language === 'zh' ? '已删除服务' : 'Service Deleted',
      message:
        language === 'zh'
          ? `服务「${site.title}」已删除。`
          : `Service "${site.title}" has been deleted.`,
    });
  };

  const handleEdit = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit(site);
  };

  const handleContainerClick = (event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      onEdit(site);
      return;
    }

    onOpen();
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`group relative flex flex-col h-full rounded-[26px] p-5 md:p-6 border border-white/60 dark:border-white/10 shadow-[0_18px_40px_-28px_rgba(30,64,175,0.55)] bg-gradient-to-br ${theme.panel} backdrop-blur-xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_55px_-30px_rgba(79,70,229,0.55)] cursor-pointer`}
      title="Click to open · Ctrl/Cmd + Click to edit"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 w-28 h-28 rounded-full bg-white/25 dark:bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute left-[-14px] top-8 w-1.5 h-16 rounded-full bg-black/25 dark:bg-white/20" />

      <div className="relative flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl border ${theme.icon} backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105 shadow-sm`}>
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={handleIconLoadError}
              className="w-6 h-6 rounded object-contain opacity-95"
            />
          ) : (
            <div className="opacity-95">{renderIcon()}</div>
          )}
        </div>

        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-[-4px] group-hover:translate-y-0">
          <button
            onClick={handleEdit}
            className="p-2 rounded-lg bg-white/75 dark:bg-black/30 border border-white/70 dark:border-white/10 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={handleDelete}
            className={`p-2 rounded-lg border transition-colors ${
              isDeleteArmed
                ? 'bg-red-100 dark:bg-red-900/30 border-red-200/70 dark:border-red-500/40 text-red-600'
                : 'bg-white/75 dark:bg-black/30 border-white/70 dark:border-white/10 text-slate-500 hover:text-red-500'
            }`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 pointer-events-none">
        <h3 className="font-black text-lg text-slate-900 dark:text-slate-50 tracking-tight leading-tight mb-2 truncate">
          {site.title}
        </h3>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300/90 leading-relaxed line-clamp-2 min-h-11">
          {site.description || (isSystemDev ? 'System service endpoint' : 'Quick access link')}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 min-h-7">
        {site.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md border border-white/70 dark:border-white/10 ${theme.chip}`}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {site.status && <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(site.status)}`} />}
          {isSystemDev ? (
            <span className={`text-[10px] font-black tracking-widest ${currentEnv === 'DEV' ? 'text-cyan-700 dark:text-cyan-300' : 'text-orange-600 dark:text-orange-300'}`}>
              {currentEnv === 'DEV' ? 'DEV' : 'PROD'}
            </span>
          ) : (
            <span className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-300">LINK</span>
          )}
        </div>

        {activeUrl && (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onOpen();
            }}
            className="p-2 rounded-full bg-white/75 dark:bg-black/30 border border-white/70 dark:border-white/10 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            <ArrowUpRight size={14} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SiteCard;
