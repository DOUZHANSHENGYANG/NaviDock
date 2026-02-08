import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Pencil, Trash2, Save, ChevronDown } from 'lucide-react';
import { useNavStore } from '../context/NavContext';
import { Category } from '../types';
import { useToast } from '../context/ToastContext';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    categories,
    sites,
    addCategory,
    updateCategory,
    deleteCategory,
    importCategoryId,
    setImportCategory,
    language,
    t,
  } = useNavStore();
  const { showToast } = useToast();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const deleteTimerRef = useRef<number | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPendingDeleteId(null);
      setEditingCategory(null);
      setEditingName('');
      setIsImportMenuOpen(false);
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isImportMenuOpen) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!importMenuRef.current) return;
      if (importMenuRef.current.contains(event.target as Node)) return;
      setIsImportMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [isImportMenuOpen]);

  const categorySiteCount = useMemo(() => {
    const counter = new Map<string, number>();
    for (const site of sites) {
      counter.set(site.categoryId, (counter.get(site.categoryId) || 0) + 1);
    }
    return counter;
  }, [sites]);

  if (!isOpen) return null;

  const clearDeleteArm = () => {
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setPendingDeleteId(null);
  };

  const beginEdit = (category: Category) => {
    setEditingCategory(category);
    setEditingName(t(category.name));
  };

  const submitNewCategory = async () => {
    const value = newCategoryName.trim();
    if (!value) return;

    try {
      setIsSaving(true);
      await addCategory(value);
      setNewCategoryName('');
      showToast({
        variant: 'success',
        title: language === 'zh' ? '已新增分类' : 'Category Added',
        message: language === 'zh' ? '分类创建成功。' : 'Category has been created.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editingCategory) return;
    const value = editingName.trim();
    if (!value) return;

    try {
      setIsSaving(true);
      await updateCategory(editingCategory.id, value);
      setEditingCategory(null);
      setEditingName('');
      showToast({
        variant: 'success',
        title: language === 'zh' ? '已保存' : 'Saved',
        message: language === 'zh' ? '分类名称更新成功。' : 'Category name updated successfully.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const submitDelete = async (category: Category) => {
    const count = categorySiteCount.get(category.id) || 0;

    if (pendingDeleteId !== category.id) {
      setPendingDeleteId(category.id);
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }
      deleteTimerRef.current = window.setTimeout(() => {
        setPendingDeleteId(null);
        deleteTimerRef.current = null;
      }, 2600);

      showToast({
        variant: 'warning',
        title: language === 'zh' ? '再次点击确认删除' : 'Click Again to Confirm',
        message:
          language === 'zh'
            ? `将删除分类「${t(category.name)}」${count > 0 ? `及其 ${count} 条站点` : ''}。`
            : `Category "${t(category.name)}"${count > 0 ? ` and ${count} linked sites` : ''} will be deleted.`,
        durationMs: 2600,
      });
      return;
    }

    clearDeleteArm();

    try {
      setIsSaving(true);
      await deleteCategory(category.id);
      showToast({
        variant: 'success',
        title: language === 'zh' ? '分类已删除' : 'Category Deleted',
        message: language === 'zh' ? '分类删除成功。' : 'Category deleted successfully.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateImportCategory = async (categoryId: string) => {
    setIsImportMenuOpen(false);
    try {
      setIsSaving(true);
      await setImportCategory(categoryId);
      showToast({
        variant: 'info',
        title: language === 'zh' ? '默认导入已更新' : 'Default Import Updated',
        message:
          language === 'zh'
            ? '新的导入分类已生效。'
            : 'New default import category is now active.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedImportCategory = categories.find(category => category.id === importCategoryId) || categories[0];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-panel w-full max-w-3xl rounded-[28px] shadow-2xl overflow-hidden">
        <div className="px-8 py-5 border-b border-white/40 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('settings.category_mgmt')}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              {language === 'zh' ? '集中管理分类、重命名、删除与默认导入分类。' : 'Centralized category create, rename, delete and default import category.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/40 dark:hover:bg-white/10 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <input
              value={newCategoryName}
              onChange={event => setNewCategoryName(event.target.value)}
              placeholder={language === 'zh' ? '输入新分类名称' : 'Enter a new category name'}
              className="w-full bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/20"
            />
            <button
              onClick={() => { void submitNewCategory(); }}
              disabled={isSaving || !newCategoryName.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-DEFAULT to-emerald-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
            >
              <Plus size={16} />
              {language === 'zh' ? '新增分类' : 'Add Category'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                {t('settings.default_import_category')}
              </p>
              <div ref={importMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsImportMenuOpen(prev => !prev)}
                  className="w-full rounded-xl bg-gradient-to-r from-white/90 to-cyan-50/85 dark:from-black/35 dark:to-cyan-950/20 border border-cyan-200/70 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-100 flex items-center justify-between shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/20"
                >
                  <span className="truncate">{selectedImportCategory ? t(selectedImportCategory.name) : '-'}</span>
                  <ChevronDown size={16} className={`transition-transform ${isImportMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isImportMenuOpen && (
                  <div className="absolute z-[140] mt-2 w-full max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-white/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl">
                    {categories.map(category => {
                      const active = category.id === importCategoryId;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => { void updateImportCategory(category.id); }}
                          className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors flex items-center justify-between ${
                            active
                              ? 'bg-gradient-to-r from-brand-DEFAULT/20 to-emerald-500/20 text-brand-DEFAULT dark:text-emerald-200'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate">{t(category.name)}</span>
                          {active ? (
                            <span className="text-[10px] font-black tracking-wider uppercase">
                              {language === 'zh' ? '当前' : 'Current'}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end text-xs text-slate-500 dark:text-slate-300">
              {language === 'zh'
                ? '导入书签时会默认使用此分类，也可在导入弹窗中临时切换。'
                : 'Bookmark import uses this category by default, and can still be changed in import modal.'}
            </div>
          </div>

          <div className="space-y-3">
            {categories.map(category => {
              const count = categorySiteCount.get(category.id) || 0;
              const isEditing = editingCategory?.id === category.id;
              const isSystem = category.type === 'system';
              const isDeleteArmed = pendingDeleteId === category.id;
              const badgeBaseClass =
                'inline-flex min-h-[22px] items-center rounded-full px-2.5 py-1 text-[13px] font-extrabold leading-none tracking-[0.02em] shadow-sm';
              const typeBadgeClass = isSystem
                ? 'bg-indigo-200 text-indigo-900 ring-1 ring-indigo-300/70 dark:bg-indigo-500/80 dark:text-indigo-50 dark:ring-indigo-200/70'
                : 'bg-emerald-200 text-emerald-900 ring-1 ring-emerald-300/70 dark:bg-emerald-500/80 dark:text-emerald-50 dark:ring-emerald-200/70';

              return (
                <div key={category.id} className="glass-card rounded-2xl p-4 border border-white/30 dark:border-white/10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{t(category.name)}</span>
                        <span className={`${badgeBaseClass} ${typeBadgeClass}`}>
                          {isSystem ? 'SYSTEM' : 'USER'}
                        </span>
                        {importCategoryId === category.id && (
                          <span className={`${badgeBaseClass} bg-teal-200 text-teal-900 ring-1 ring-teal-300/70 dark:bg-teal-500/80 dark:text-teal-50 dark:ring-teal-200/70`}>
                            {language === 'zh' ? '默认导入' : 'Default Import'}
                          </span>
                        )}
                        {isDeleteArmed && (
                          <span className={`${badgeBaseClass} bg-red-200 text-red-900 ring-1 ring-red-300/70 dark:bg-red-500/80 dark:text-red-50 dark:ring-red-200/70`}>
                            {language === 'zh' ? '再次点击删除' : 'Click again to delete'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{language === 'zh' ? `${count} 个网址` : `${count} sites`}</p>
                    </div>

                    {!isSystem && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => beginEdit(category)}
                          className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-slate-500"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { void submitDelete(category); }}
                          className={`p-2 rounded-lg transition-colors ${
                            isDeleteArmed
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                              : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={editingName}
                        onChange={event => setEditingName(event.target.value)}
                        className="flex-1 bg-white/70 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl px-4 py-2 text-sm"
                      />
                      <button
                        onClick={() => { void submitEdit(); }}
                        disabled={!editingName.trim()}
                        className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold disabled:opacity-60 flex items-center gap-1"
                      >
                        <Save size={14} />
                        {language === 'zh' ? '保存' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;
