import React, { useState, useEffect } from 'react';
import { X, Plus, Wand2, Link as LinkIcon, Smile, Terminal } from 'lucide-react';
import { SiteItem } from '../types';
import { useNavStore } from '../context/NavContext';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: SiteItem) => void;
  initialData?: SiteItem | null;
}

const AddSiteModal: React.FC<AddSiteModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { t, categories, updateSite, selectedCategoryId } = useNavStore();
  
  // Default to currently selected category or the first one
  const defaultCat = selectedCategoryId || categories[0]?.id || 'cat-system-dev';

  const [formData, setFormData] = useState<Partial<SiteItem>>({
    title: '',
    description: '',
    envConfig: { devUrl: '', prodUrl: '' },
    tags: [],
    categoryId: defaultCat,
    status: 'pending',
    viewType: 'browser'
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
          setFormData({ ...initialData });
      } else {
        setFormData({
            title: '',
            description: '',
            envConfig: { devUrl: '', prodUrl: '' },
            tags: [],
            categoryId: selectedCategoryId || categories[0]?.id || 'cat-system-dev',
            status: 'pending',
            viewType: 'browser'
        });
      }
      setTagInput('');
    }
  }, [isOpen, initialData, categories, selectedCategoryId]);

  if (!isOpen) return null;

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        const newTags = Array.from(new Set([...(formData.tags || []), tagInput.trim()]));
        setFormData({ ...formData, tags: newTags });
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    // Validate URLs based on category type
    if (formData.categoryId === 'cat-system-dev') {
        if (!formData.envConfig?.prodUrl && !formData.envConfig?.devUrl) return; 
    } else {
        if (!formData.envConfig?.prodUrl) return;
    }

    if (initialData) {
        updateSite(initialData.id, formData);
    } else {
        const newSite: SiteItem = {
            ...formData as SiteItem,
            id: crypto.randomUUID(),
        };
        onSave(newSite);
    }
    onClose();
  };

  const mockAutoFetch = () => {
    const targetUrl = formData.envConfig?.prodUrl || formData.envConfig?.devUrl;
    if (targetUrl) {
        setFormData(prev => ({
            ...prev,
            title: prev.title || 'Fetched Service Title',
            description: prev.description || 'This description was auto-fetched from the provided URL metadata.'
        }))
    }
  }

  const InputLabel = ({ children }: { children: React.ReactNode }) => (
      <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-1">{children}</label>
  );

  const isSystemDev = formData.categoryId === 'cat-system-dev';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      
      {/* Modal Content - Frosted Glass */}
      <div className="relative glass-panel w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/40 dark:border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {initialData ? t('modal.edit_title') : t('modal.add_title')}
            </h2>
            <p className="text-sm font-medium text-slate-400 mt-0.5">{t('modal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form id="add-site-form" onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div>
                        <InputLabel>{t('modal.title_label')}</InputLabel>
                        <input 
                            type="text" 
                            className="w-full bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/10 focus:border-brand-DEFAULT/50 focus:bg-white/70 dark:focus:bg-black/40 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none transition-all dark:text-white placeholder:text-slate-400 backdrop-blur-sm"
                            placeholder="e.g. Jenkins Master"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <InputLabel>{t('modal.category_label')}</InputLabel>
                        <div className="relative">
                            <select 
                                className="w-full bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/10 focus:border-brand-DEFAULT/50 focus:bg-white/70 dark:focus:bg-black/40 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none transition-all dark:text-white appearance-none cursor-pointer backdrop-blur-sm"
                                value={formData.categoryId}
                                onChange={e => {
                                    const newVal = e.target.value;
                                    setFormData(prev => ({ 
                                        ...prev, 
                                        categoryId: newVal,
                                        envConfig: newVal !== 'cat-system-dev' ? { ...prev.envConfig!, devUrl: '' } : prev.envConfig
                                    }));
                                }}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{t(cat.name)}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Smile size={16} />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col h-full">
                    <InputLabel>{t('modal.desc_label')}</InputLabel>
                    <textarea 
                        className="flex-1 w-full bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/10 focus:border-brand-DEFAULT/50 focus:bg-white/70 dark:focus:bg-black/40 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none resize-none dark:text-white placeholder:text-slate-400 transition-all backdrop-blur-sm"
                        placeholder="..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>
            </div>

            <div className="bg-indigo-50/40 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 uppercase tracking-wide">
                        <LinkIcon size={14} /> {t('modal.env_mapping')}
                    </h3>
                    <button type="button" onClick={mockAutoFetch} className="text-[10px] font-bold text-indigo-600 bg-white/70 dark:bg-white/10 dark:text-indigo-300 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1">
                        <Wand2 size={10} /> {t('modal.auto_fetch')}
                    </button>
                </div>

                {isSystemDev ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel>{t('modal.dev_url')}</InputLabel>
                            <input 
                                type="url" 
                                className="w-full bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                placeholder="https://dev..."
                                value={formData.envConfig?.devUrl}
                                onChange={e => setFormData({...formData, envConfig: { ...formData.envConfig!, devUrl: e.target.value }})}
                            />
                        </div>
                        <div>
                            <InputLabel>{t('modal.prod_url')}</InputLabel>
                            <input 
                                type="url" 
                                className="w-full bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all dark:text-white"
                                placeholder="https://prod..."
                                value={formData.envConfig?.prodUrl}
                                onChange={e => setFormData({...formData, envConfig: { ...formData.envConfig!, prodUrl: e.target.value }})}
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                         <InputLabel>{t('modal.target_url')}</InputLabel>
                         <input 
                             type="url" 
                             className="w-full bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                             placeholder="https://..."
                             value={formData.envConfig?.prodUrl}
                             onChange={e => setFormData({...formData, envConfig: { devUrl: '', prodUrl: e.target.value }})}
                         />
                    </div>
                )}
            </div>

            <div>
                <InputLabel>{t('modal.tags_label')}</InputLabel>
                <div className="w-full bg-white/40 dark:bg-black/20 border border-white/40 dark:border-white/10 focus-within:bg-white/60 dark:focus-within:bg-black/30 focus-within:ring-2 focus-within:ring-brand-DEFAULT/20 rounded-xl px-4 py-3 min-h-[50px] flex flex-wrap gap-2 items-center transition-all backdrop-blur-sm">
                    {formData.tags?.map(tag => (
                        <span key={tag} className="bg-white/70 dark:bg-white/10 text-slate-700 dark:text-slate-200 shadow-sm border border-black/5 dark:border-white/10 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-md">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12}/></button>
                        </span>
                    ))}
                    <input 
                        type="text" 
                        className="bg-transparent text-sm font-medium focus:outline-none flex-1 min-w-[100px] dark:text-white placeholder:text-slate-400"
                        placeholder={t('modal.tags_placeholder')}
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                    />
                </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 flex justify-end gap-3 rounded-b-[32px] backdrop-blur-xl">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-sm">{t('modal.cancel')}</button>
            <button 
                type="submit" 
                form="add-site-form"
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-slate-900 dark:bg-white dark:text-black hover:scale-105 shadow-lg shadow-slate-900/20 transition-all text-sm flex items-center gap-2"
            >
                <Plus size={16} /> {t('modal.save')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddSiteModal;