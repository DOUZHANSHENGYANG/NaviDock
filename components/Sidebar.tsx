import React, { useEffect, useRef, useState } from 'react';
import { useNavStore } from '../context/NavContext';
import { FolderOpen, Settings, Command, Terminal, Wrench, Book, Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { Category } from '../types';
import CategoryManagerModal from './CategoryManagerModal';
import { useToast } from '../context/ToastContext';

interface SidebarProps {
  onOpenSettings: () => void;
}

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: React.ReactNode;
  actions?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const {
    categories,
    selectedCategoryId,
    setCategory,
    updateCategory,
    deleteCategory,
    sites,
    language,
    t,
  } = useNavStore();
  const { showToast } = useToast();

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const clearDeleteArm = () => {
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setPendingDeleteCategoryId(null);
  };

  const armDelete = (category: Category, siteCount: number) => {
    clearDeleteArm();
    setPendingDeleteCategoryId(category.id);

    showToast({
      variant: 'warning',
      title: language === 'zh' ? '再次点击确认删除' : 'Click Again to Confirm',
      message:
        language === 'zh'
          ? `将删除分类「${t(category.name)}」${siteCount > 0 ? `及其 ${siteCount} 条站点` : ''}。`
          : `Category "${t(category.name)}"${siteCount > 0 ? ` and ${siteCount} linked sites` : ''} will be deleted.`,
      durationMs: 2600,
    });

    deleteTimerRef.current = window.setTimeout(() => {
      setPendingDeleteCategoryId(null);
      deleteTimerRef.current = null;
    }, 2600);
  };

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

  const handleRenameStart = (category: Category) => {
    setRenamingCategoryId(category.id);
    setRenameInput(t(category.name));
  };

  const handleRenameCancel = () => {
    setRenamingCategoryId(null);
    setRenameInput('');
  };

  const handleRenameSubmit = async (category: Category) => {
    const trimmed = renameInput.trim();
    if (!trimmed) {
      showToast({
        variant: 'warning',
        title: language === 'zh' ? '名称不能为空' : 'Name Required',
        message: language === 'zh' ? '请输入分类名称。' : 'Please enter a category name.',
      });
      return;
    }

    if (trimmed === t(category.name)) {
      handleRenameCancel();
      return;
    }

    await updateCategory(category.id, trimmed);
    handleRenameCancel();

    showToast({
      variant: 'success',
      title: language === 'zh' ? '分类已更新' : 'Category Updated',
      message: language === 'zh' ? '分类名称修改成功。' : 'Category name has been updated.',
    });
  };

  const handleDeleteCategory = async (category: Category) => {
    const siteCount = sites.filter(site => site.categoryId === category.id).length;

    if (pendingDeleteCategoryId !== category.id) {
      armDelete(category, siteCount);
      return;
    }

    clearDeleteArm();
    await deleteCategory(category.id);

    showToast({
      variant: 'success',
      title: language === 'zh' ? '分类已删除' : 'Category Deleted',
      message:
        language === 'zh'
          ? `已删除分类「${t(category.name)}」。`
          : `Category "${t(category.name)}" has been deleted.`,
    });
  };

  const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon: Icon, label, actions }) => (
    <div className="group relative">
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 relative ${
          actions ? 'pr-20' : ''
        } ${
          active
            ? 'bg-gradient-to-r from-brand-light to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/10 text-emerald-800 dark:text-emerald-200 shadow-sm border border-emerald-100/50 dark:border-emerald-500/20'
            : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <div
          className={`transition-colors duration-300 ${
            active
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
        >
          <Icon size={20} />
        </div>
        <div className="truncate flex-1 text-left">{label}</div>
      </button>

      {actions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className="w-64 h-screen fixed left-0 top-0 z-50 flex flex-col
        bg-white/65 dark:bg-black/60
        backdrop-blur-xl border-r border-white/50 dark:border-white/10
        transition-colors duration-300 shadow-[2px_0_30px_-10px_rgba(0,0,0,0.05)]"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-DEFAULT to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-DEFAULT/20 ring-4 ring-white/30 dark:ring-white/5">
              <Command size={22} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none font-['Plus_Jakarta_Sans']">
                PortalHub
              </h1>
              <p className="text-[10px] font-bold text-brand-DEFAULT mt-1 uppercase tracking-widest opacity-80">Workspace</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar pt-2">
          <div>
            <div className="px-2 mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {t('nav.categories')}
              </span>
              <button
                onClick={() => setIsCategoryManagerOpen(true)}
                className="p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 transition-all"
                title={t('settings.category_mgmt')}
              >
                <Settings size={14} strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-1">
              {categories.map(category => {
                const active = selectedCategoryId === category.id;
                const isUserCategory = category.type === 'user';
                const isRenaming = renamingCategoryId === category.id;
                const isDeleteArmed = pendingDeleteCategoryId === category.id;

                return (
                  <NavItem
                    key={category.id}
                    active={active}
                    onClick={() => {
                      if (!isRenaming) {
                        setCategory(category.id);
                      }
                    }}
                    icon={getIcon(category.icon)}
                    label={
                      isRenaming ? (
                        <input
                          autoFocus
                          value={renameInput}
                          onChange={event => setRenameInput(event.target.value)}
                          onClick={event => event.stopPropagation()}
                          onMouseDown={event => event.stopPropagation()}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleRenameSubmit(category);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              handleRenameCancel();
                            }
                          }}
                          className="w-full rounded-lg bg-white/80 dark:bg-black/30 border border-white/70 dark:border-white/10 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/30"
                        />
                      ) : (
                        <span className="truncate">{t(category.name)}</span>
                      )
                    }
                    actions={
                      isUserCategory ? (
                        isRenaming ? (
                          <>
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                void handleRenameSubmit(category);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-600 hover:text-emerald-700 border border-white/60 dark:border-white/10 transition-colors"
                              title={language === 'zh' ? '保存分类名' : 'Save category name'}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                handleRenameCancel();
                              }}
                              className="p-1.5 rounded-lg bg-white/80 dark:bg-black/30 text-slate-500 hover:text-slate-700 border border-white/60 dark:border-white/10 transition-colors"
                              title={language === 'zh' ? '取消编辑' : 'Cancel'}
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                handleRenameStart(category);
                              }}
                              className="p-1.5 rounded-lg bg-white/80 dark:bg-black/30 text-slate-500 hover:text-brand-DEFAULT hover:bg-white dark:hover:bg-white/10 border border-white/60 dark:border-white/10 transition-colors"
                              title={language === 'zh' ? '重命名分类' : 'Rename category'}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                void handleDeleteCategory(category);
                              }}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isDeleteArmed
                                  ? 'bg-red-100 dark:bg-red-900/35 text-red-600 border-red-200/70 dark:border-red-500/30'
                                  : 'bg-white/80 dark:bg-black/30 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-white/60 dark:border-white/10'
                              }`}
                              title={language === 'zh' ? '删除分类' : 'Delete category'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )
                      ) : null
                    }
                  />
                );
              })}
            </div>

            <div className="pt-4">
              <button
                onClick={() => setIsCategoryManagerOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-emerald-300/70 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/25 transition-all text-sm font-bold"
              >
                <Plus size={16} />
                <span>{t('nav.add_cat')}</span>
              </button>
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

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
      />
    </>
  );
};

export default Sidebar;
