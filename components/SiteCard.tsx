import React from 'react';
import { SiteItem, Environment } from '../types';
import { ExternalLink, Globe, Layout, Server, Database, Cloud, Edit2, Trash2, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { useNavStore } from '../context/NavContext';

interface SiteCardProps {
  site: SiteItem;
  currentEnv: Environment;
  onEdit: (site: SiteItem) => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, currentEnv, onEdit }) => {
  const { t, deleteSite } = useNavStore();
  
  const isSystemDev = site.categoryId === 'cat-system-dev';
  
  const activeUrl = isSystemDev 
    ? (currentEnv === 'DEV' ? site.envConfig.devUrl : site.envConfig.prodUrl) 
    : site.envConfig.prodUrl;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]';
      case 'offline': return 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]';
      case 'pending': return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
      default: return 'bg-gray-400';
    }
  };

  const getCardTheme = (str: string) => {
    // Glass style backgrounds for icons
    const themes = [
      { bg: 'bg-teal-500/10 text-teal-600 border-teal-200/30', darkBg: 'dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-500/20' },
      { bg: 'bg-purple-500/10 text-purple-600 border-purple-200/30', darkBg: 'dark:bg-purple-400/10 dark:text-purple-300 dark:border-purple-500/20' },
      { bg: 'bg-orange-500/10 text-orange-600 border-orange-200/30', darkBg: 'dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-500/20' },
      { bg: 'bg-pink-500/10 text-pink-600 border-pink-200/30', darkBg: 'dark:bg-pink-400/10 dark:text-pink-300 dark:border-pink-500/20' },
      { bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200/30', darkBg: 'dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-500/20' },
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
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
  }

  const handleDelete = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(window.confirm(`Delete ${site.title}?`)) {
          await deleteSite(site.id);
      }
  }

  const handleEdit = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onEdit(site);
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
        if (activeUrl) {
            window.open(activeUrl, '_blank');
        }
    }
  };

  return (
    <div 
        onClick={handleContainerClick}
        className="glass-card group relative flex flex-col h-full rounded-[28px] p-6 hover:shadow-glass-hover hover:-translate-y-1 transition-all duration-300 cursor-default"
        title="Ctrl + Click to open directly"
    >
      
      {/* Header: Icon & Options */}
      <div className="relative flex justify-between items-start mb-5">
        <div className={`w-14 h-14 rounded-2xl ${theme.bg} ${theme.darkBg} border backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 shadow-sm`}>
           <div className="text-current opacity-90">{renderIcon()}</div>
        </div>
        
        {/* Hover Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-[-5px] group-hover:translate-y-0">
            <button onClick={handleEdit} className="p-2 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl text-slate-400 hover:text-brand-DEFAULT transition-colors">
                <Edit2 size={14} />
            </button>
            <button onClick={handleDelete} className="p-2 hover:bg-red-50/60 dark:hover:bg-red-900/30 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate tracking-tight">{site.title}</h3>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-5 h-10 opacity-80">
          {site.description}
        </p>
      </div>

      {/* Tags (Glass Pills) */}
      <div className="flex flex-wrap gap-2 mb-6 h-6">
        {site.tags.slice(0, 3).map((tag, idx) => {
             const colors = ['bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400'];
             const bg = colors[idx % colors.length];
             return (
                <div key={idx} className={`h-1.5 w-6 rounded-full ${bg} opacity-70`} title={tag}></div>
             )
        })}
      </div>

      {/* Footer Area */}
      <div className="relative pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-2">
            {site.status && <div className={`w-2 h-2 rounded-full ${getStatusColor(site.status)}`}></div>}
            {isSystemDev && (
                <span className={`text-[9px] font-black uppercase tracking-widest ${currentEnv === 'DEV' ? 'text-brand-DEFAULT' : 'text-orange-500'} opacity-90`}>
                    {currentEnv === 'DEV' ? 'DEV' : 'PROD'}
                </span>
            )}
         </div>
         
         {activeUrl && (
            <a 
                href={activeUrl}
                target={site.viewType === 'browser' ? '_blank' : 'webview_frame'}
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} 
                className="p-2 rounded-full bg-white/40 dark:bg-white/5 text-slate-400 hover:text-brand-DEFAULT hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm backdrop-blur-sm"
            >
                <ArrowUpRight size={14} strokeWidth={3} />
            </a>
         )}
      </div>

    </div>
  );
};

export default SiteCard;
