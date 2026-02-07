import React, { useState } from 'react';
import { useNavStore } from '../context/NavContext';
import { FolderOpen, Settings, Plus, Trash2, Command, Terminal, Wrench, Book, Edit2 } from 'lucide-react';
import { Category } from '../types';

interface SidebarProps {
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const { categories, selectedCategoryId, setCategory, addCategory, updateCategory, deleteCategory, sites, t } = useNavStore();
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Editing State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if(newCatName.trim()) {
          addCategory(newCatName);
          setNewCatName('');
          setIsAddingCat(false);
      }
  };

  const handleStartEdit = (e: React.MouseEvent, cat: Category) => {
      e.stopPropagation();
      setEditingCatId(cat.id);
      setEditCatName(t(cat.name)); 
  }

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingCatId && editCatName.trim()) {
          updateCategory(editingCatId, editCatName.trim());
          setEditingCatId(null);
          setEditCatName('');
      }
  }

  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      // Check count
      const count = sites.filter(s => s.categoryId === id).length;
      let confirmed = false;
      
      if (count > 0) {
        confirmed = window.confirm(t('confirm.delete_cat_items', { count }));
      } else {
        confirmed = window.confirm(t('confirm.delete_cat_empty'));
      }

      if(confirmed) {
          deleteCategory(id);
      }
  };

  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'Terminal': return Terminal;
          case 'Wrench': return Wrench;
          case 'Book': return Book;
          default: return FolderOpen;
      }
  }

  const NavItem = ({ 
    active, 
    onClick, 
    icon: Icon, 
    label, 
    children 
  }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group relative
        ${active 
            /* Active State: Liquid Gradient Pill */
            ? 'bg-gradient-to-r from-brand-light to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/10 text-emerald-800 dark:text-emerald-200 shadow-sm border border-emerald-100/50 dark:border-emerald-500/20' 
            /* Inactive State: Transparent hover */
            : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
        }`}
    >
        {/* Icon Container */}
        <div className={`transition-colors duration-300 ${active ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
            <Icon size={20} />
        </div>
        <span className="truncate flex-1 text-left">{label}</span>
        {children}
    </button>
  );

  return (
    /* Glass Sidebar */
    <aside className="w-64 h-screen fixed left-0 top-0 z-50 flex flex-col 
        bg-white/65 dark:bg-black/60 
        backdrop-blur-xl border-r border-white/50 dark:border-white/10 
        transition-colors duration-300 shadow-[2px_0_30px_-10px_rgba(0,0,0,0.05)]">
      
      {/* Brand Header */}
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
        
        {/* Categories */}
        <div>
            <div className="px-2 mb-3 flex items-center justify-between group">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('nav.categories')}</span>
                <button 
                    onClick={() => setIsAddingCat(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 transition-all"
                    title={t('nav.add_cat')}
                >
                    <Plus size={14} strokeWidth={3} />
                </button>
            </div>

            {/* Inline Add Category Input */}
            {isAddingCat && (
                <form onSubmit={handleAddCategory} className="px-1 mb-2">
                    <input 
                        autoFocus
                        type="text" 
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onBlur={() => !newCatName && setIsAddingCat(false)}
                        placeholder="Name..."
                        className="w-full bg-white/50 dark:bg-white/5 border border-brand-DEFAULT rounded-xl px-4 py-2 text-sm focus:outline-none dark:text-white shadow-sm backdrop-blur-sm"
                    />
                </form>
            )}

            <div className="space-y-1">
                {/* Fixed & User Categories */}
                {categories.map((cat, index) => {
                    const active = selectedCategoryId === cat.id;

                    // Render inline edit form if editing
                    if (editingCatId === cat.id) {
                        return (
                            <form key={cat.id} onSubmit={handleSaveEdit} className="px-1 py-1">
                                <input
                                    autoFocus
                                    type="text"
                                    value={editCatName}
                                    onChange={(e) => setEditCatName(e.target.value)}
                                    onBlur={() => setEditingCatId(null)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setEditingCatId(null);
                                    }}
                                    className="w-full bg-white dark:bg-black/40 border-2 border-brand-DEFAULT rounded-xl px-3 py-2 text-sm focus:outline-none dark:text-white shadow-sm"
                                />
                            </form>
                        )
                    }

                    return (
                        <NavItem
                            key={cat.id}
                            active={active}
                            onClick={() => setCategory(cat.id)}
                            icon={getIcon(cat.icon)}
                            label={t(cat.name)}
                        >
                            {cat.type === 'user' && (
                                <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => handleStartEdit(e, cat)}
                                        className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 hover:text-emerald-600 transition-colors shadow-sm"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteCategory(e, cat.id)}
                                        className="p-1.5 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </NavItem>
                    )
                })}
            </div>
        </div>
      </div>

      {/* Footer */}
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