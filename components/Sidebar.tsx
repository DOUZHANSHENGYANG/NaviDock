import React from 'react';
import { useNavStore } from '../context/NavContext';
import { FolderOpen, Settings, Command, Terminal, Wrench, Book } from 'lucide-react';

interface SidebarProps {
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const { categories, selectedCategoryId, setCategory, t } = useNavStore();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Terminal':
        return Terminal;
      case 'Wrench':
        return Wrench;
      case 'Book':
        return Book;
      default:
        return FolderOpen;
    }
  };

  const NavItem = ({ active, onClick, icon: Icon, label }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group relative
        ${active
          ? 'bg-gradient-to-r from-brand-light to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/10 text-emerald-800 dark:text-emerald-200 shadow-sm border border-emerald-100/50 dark:border-emerald-500/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
        }`}
    >
      <div className={`transition-colors duration-300 ${active ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
        <Icon size={20} />
      </div>
      <span className="truncate flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 z-50 flex flex-col
        bg-white/65 dark:bg-black/60
        backdrop-blur-xl border-r border-white/50 dark:border-white/10
        transition-colors duration-300 shadow-[2px_0_30px_-10px_rgba(0,0,0,0.05)]">

      <div className="p-8">
        <div className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-DEFAULT to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-DEFAULT/20 ring-4 ring-white/30 dark:ring-white/5">
            <Command size={22} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none font-['Plus_Jakarta_Sans']">PortalHub</h1>
            <p className="text-[10px] font-bold text-brand-DEFAULT mt-1 uppercase tracking-widest opacity-80">Workspace</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar pt-2">
        <div>
          <div className="px-2 mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('nav.categories')}</span>
            <button
              onClick={onOpenSettings}
              className="p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 transition-all"
              title={t('settings.category_mgmt')}
            >
              <Settings size={14} strokeWidth={3} />
            </button>
          </div>

          <div className="space-y-1">
            {categories.map(cat => {
              const active = selectedCategoryId === cat.id;

              return (
                <NavItem
                  key={cat.id}
                  active={active}
                  onClick={() => setCategory(cat.id)}
                  icon={getIcon(cat.icon)}
                  label={t(cat.name)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/50 dark:border-white/10">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all"
        >
          <Settings size={20} />
          <span>{t('settings.title')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
