import React, { useState } from 'react';
import { useNavStore } from './context/NavContext';
import Sidebar from './components/Sidebar';
import SiteCard from './components/SiteCard';
import AddSiteModal from './components/AddSiteModal';
import SettingsModal from './components/SettingsModal';
import { SiteItem } from './types';
import { Search, LayoutGrid, List as ListIcon, Plus, SlidersHorizontal, PackageOpen, Rocket, TestTube2 } from 'lucide-react';

const App: React.FC = () => {
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
    t
  } = useNavStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);

  const handleEditSite = (site: SiteItem) => {
    setEditingSite(site);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSite(null);
  }

  // Handle click on list item: Ctrl+Click to open, Click to edit
  const handleListRowClick = (e: React.MouseEvent, site: SiteItem) => {
    if (e.ctrlKey || e.metaKey) {
        const isSystemDev = site.categoryId === 'cat-system-dev';
        const url = isSystemDev 
            ? (environment === 'DEV' ? site.envConfig.devUrl : site.envConfig.prodUrl) 
            : site.envConfig.prodUrl;
        
        if (url) {
            window.open(url, '_blank');
        }
        return;
    }
    handleEditSite(site);
  };

  // Check if we are in the "System Development" category (id: cat-system-dev)
  const isSystemDevCategory = selectedCategoryId === 'cat-system-dev';

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
                                onClick={() => setEnv('PROD')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    environment === 'PROD' 
                                    ? 'bg-white dark:bg-white/10 text-orange-500 shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                }`}
                            >
                                <Rocket size={14} /> {t('nav.prod')}
                            </button>
                            <button
                                onClick={() => setEnv('DEV')}
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
                                onClick={() => setViewMode('grid')} 
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-brand-DEFAULT shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-brand-DEFAULT shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ListIcon size={18} />
                            </button>
                         </div>
                         
                         <button 
                            onClick={() => { setEditingSite(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 bg-gradient-to-r from-brand-DEFAULT to-emerald-400 text-white px-6 py-3 rounded-full font-bold text-sm hover:shadow-lg hover:shadow-brand-DEFAULT/30 hover:scale-105 active:scale-95 transition-all"
                         >
                            <Plus size={18} />
                            <span className="hidden sm:inline">New Tool</span>
                         </button>
                    </div>
                </div>

                {/* Bottom Row: Filters */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest px-2 border-r border-slate-200/50 dark:border-white/10 pr-4">
                        <SlidersHorizontal size={14} />
                        <span>Tags</span>
                     </div>
                     {allTags.map((tag, idx) => {
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
                         )
                     })}
                </div>
            </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-20 custom-scrollbar">
            {filteredSites.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                    <div className="w-24 h-24 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/50 dark:border-white/10 shadow-lg">
                         <PackageOpen size={40} className="text-slate-300 dark:text-slate-500" />
                    </div>
                    <p className="font-bold text-xl text-slate-400 dark:text-slate-600">{t('app.no_services')}</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 animate-fade-in-up">
                    {filteredSites.map(site => (
                        <SiteCard 
                            key={site.id} 
                            site={site} 
                            currentEnv={environment} 
                            onEdit={handleEditSite}
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
                            title="Ctrl + Click to open, Click to edit"
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
                            </div>
                         </div>
                    ))}
                </div>
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