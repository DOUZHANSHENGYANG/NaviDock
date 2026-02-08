import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Wand2, Link as LinkIcon, ChevronDown, Sparkles, Tags } from 'lucide-react';
import { SiteItem } from '../types';
import { useNavStore } from '../context/NavContext';
import { desktopApi, UrlMetadata } from '../services/desktopApi';
import { useToast } from '../context/ToastContext';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: SiteItem) => Promise<void>;
  initialData?: SiteItem | null;
}

const AddSiteModal: React.FC<AddSiteModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { t, categories, updateSite, selectedCategoryId, language } = useNavStore();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<Partial<SiteItem>>({
    title: '',
    description: '',
    envConfig: { devUrl: '', prodUrl: '' },
    tags: [],
    categoryId: selectedCategoryId || categories[0]?.id || 'cat-system-dev',
    status: 'pending',
    viewType: 'browser',
  });
  const [tagInput, setTagInput] = useState('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

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
        viewType: 'browser',
      });
    }

    setTagInput('');
    setIsCategoryMenuOpen(false);
  }, [isOpen, initialData, categories, selectedCategoryId]);

  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!categoryMenuRef.current) return;
      if (categoryMenuRef.current.contains(event.target as Node)) return;
      setIsCategoryMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [isCategoryMenuOpen]);

  if (!isOpen) return null;

  const handleTagKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    if (!tagInput.trim()) return;

    const nextTags = Array.from(new Set([...(formData.tags || []), tagInput.trim()]));
    setFormData({ ...formData, tags: nextTags });
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.title) return;

    if (formData.categoryId === 'cat-system-dev') {
      if (!formData.envConfig?.prodUrl && !formData.envConfig?.devUrl) return;
    } else if (!formData.envConfig?.prodUrl) {
      return;
    }

    if (initialData) {
      await updateSite(initialData.id, formData);
    } else {
      const newSite: SiteItem = {
        ...(formData as SiteItem),
        id: crypto.randomUUID(),
      };
      await onSave(newSite);
    }

    onClose();
  };

  const normalizeUrl = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const fetchMetadataInBrowser = async (url: string): Promise<UrlMetadata> => {
    const fetchHtml = async (target: string) => {
      const response = await fetch(target, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    };

    let html = await fetchHtml(url);
    if (
      url.startsWith('https://') &&
      html.includes('location.replace(location.href.replace("https://","http://"))')
    ) {
      html = await fetchHtml(url.replace(/^https:\/\//i, 'http://'));
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const title =
      doc.querySelector('title')?.textContent?.trim() ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')?.trim();

    const bodySummary = doc.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120);

    const description =
      doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[name="keywords"]')?.getAttribute('content')?.trim() ||
      bodySummary;

    return {
      title,
      description,
    };
  };

  const handleAutoFetch = async () => {
    const rawTargetUrl = (formData.envConfig?.prodUrl || formData.envConfig?.devUrl || '').trim();
    const targetUrl = normalizeUrl(rawTargetUrl);

    if (!targetUrl) {
      showToast({
        variant: 'warning',
        title: language === 'zh' ? '????' : 'URL Required',
        message: language === 'zh' ? '???????' : 'Please enter a URL first.',
      });
      return;
    }

    const queryMetadata = async (url: string) =>
      desktopApi.isEnabled
        ? desktopApi.fetchUrlMetadata(url)
        : fetchMetadataInBrowser(url);

    try {
      setIsFetchingMetadata(true);

      if (rawTargetUrl !== targetUrl) {
        const shouldUpdateProd = Boolean(formData.envConfig?.prodUrl?.trim()) || !formData.envConfig?.devUrl?.trim();
        setFormData(prev => ({
          ...prev,
          envConfig: shouldUpdateProd
            ? {
                devUrl: prev.envConfig?.devUrl || '',
                prodUrl: targetUrl,
              }
            : {
                devUrl: targetUrl,
                prodUrl: prev.envConfig?.prodUrl || '',
              },
        }));
      }

      let metadata = await queryMetadata(targetUrl);
      let title = metadata.title?.trim();
      let description = metadata.description?.trim();

      if (!description && /^https:\/\//i.test(targetUrl)) {
        const httpTarget = targetUrl.replace(/^https:\/\//i, 'http://');
        try {
          metadata = await queryMetadata(httpTarget);
          title = title || metadata.title?.trim();
          description = description || metadata.description?.trim();
        } catch (retryError) {
          console.debug('[AddSiteModal] http metadata retry failed.', retryError);
        }
      }

      if (!title && !description) {
        showToast({
          variant: 'warning',
          title: language === 'zh' ? '?????' : 'Metadata Limited',
          message:
            language === 'zh'
              ? '????????????????????'
              : 'Site did not expose enough metadata, keeping current values.',
        });
      } else if (title && !description) {
        showToast({
          variant: 'info',
          title: language === 'zh' ? '?????' : 'Title Fetched',
          message:
            language === 'zh'
              ? '??????????????????'
              : 'Title was fetched, description can be filled manually if needed.',
        });
      } else {
        showToast({
          variant: 'success',
          title: language === 'zh' ? '??????' : 'Metadata Fetched',
          message:
            language === 'zh'
              ? '???????/????????'
              : 'Title/description were filled when available.',
        });
      }

      setFormData(prev => ({
        ...prev,
        title: title || prev.title || '',
        description: description || prev.description || '',
      }));
    } catch (error) {
      console.error('[AddSiteModal] Auto-fetch metadata failed.', error);
      showToast({
        variant: 'error',
        title: language === 'zh' ? '??????' : 'Auto Fetch Failed',
        message:
          language === 'zh'
            ? '????????????????????'
            : 'Some websites block scraping, please fill title and description manually.',
      });
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId,
      envConfig:
        categoryId === 'cat-system-dev'
          ? {
              devUrl: prev.envConfig?.devUrl || '',
              prodUrl: prev.envConfig?.prodUrl || '',
            }
          : {
              devUrl: '',
              prodUrl: prev.envConfig?.prodUrl || '',
            },
    }));
    setIsCategoryMenuOpen(false);
  };

  const selectedCategory = categories.find(category => category.id === formData.categoryId) || categories[0];
  const isSystemDev = formData.categoryId === 'cat-system-dev';

  const InputLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 pl-1">
      {children}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/20 via-cyan-400/10 to-emerald-400/20 dark:from-fuchsia-900/40 dark:via-cyan-900/20 dark:to-emerald-900/40 backdrop-blur-md"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-3xl rounded-[30px] border border-white/60 dark:border-white/10 shadow-[0_30px_120px_-35px_rgba(30,64,175,0.4)] overflow-hidden bg-gradient-to-br from-white/95 via-indigo-50/80 to-fuchsia-50/70 dark:from-slate-900/95 dark:via-indigo-950/35 dark:to-fuchsia-950/25 animate-fade-in-up">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-fuchsia-400/25 via-cyan-400/20 to-emerald-400/25"></div>

        <div className="relative px-8 py-6 border-b border-white/50 dark:border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialData ? t('modal.edit_title') : t('modal.add_title')}
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 mt-1">{t('modal.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/70 dark:bg-white/10 hover:bg-white text-slate-500 dark:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative p-8 max-h-[72vh] overflow-y-auto custom-scrollbar">
          <form id="add-site-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-indigo-100/70 dark:border-white/10 bg-white/60 dark:bg-black/20 p-5 backdrop-blur-sm space-y-5 relative z-40">
                <div>
                  <InputLabel>{t('modal.title_label')}</InputLabel>
                  <input
                    type="text"
                    className="w-full rounded-xl bg-white/85 dark:bg-black/25 border border-indigo-200/70 dark:border-white/10 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm"
                    placeholder="e.g. Jenkins Master"
                    value={formData.title}
                    onChange={event => setFormData({ ...formData, title: event.target.value })}
                  />
                </div>

                <div ref={categoryMenuRef} className="relative z-[120]">
                  <InputLabel>{t('modal.category_label')}</InputLabel>
                  <button
                    type="button"
                    onClick={() => setIsCategoryMenuOpen(prev => !prev)}
                    className="w-full rounded-xl bg-gradient-to-r from-white/90 to-cyan-50/85 dark:from-black/30 dark:to-cyan-950/20 border border-cyan-200/70 dark:border-white/10 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-100 flex items-center justify-between shadow-sm"
                  >
                    <span className="truncate">{selectedCategory ? t(selectedCategory.name) : '-'}</span>
                    <ChevronDown size={16} className={`transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCategoryMenuOpen && (
                    <div className="absolute z-[160] mt-2 w-full max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-white/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl">
                      {categories.map(category => {
                        const active = category.id === formData.categoryId;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => handleCategorySelect(category.id)}
                            className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                              active
                                ? 'bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 text-fuchsia-700 dark:text-fuchsia-200'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10'
                            }`}
                          >
                            {t(category.name)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-fuchsia-100/70 dark:border-white/10 bg-white/60 dark:bg-black/20 p-5 backdrop-blur-sm relative z-0">
                <InputLabel>{t('modal.desc_label')}</InputLabel>
                <textarea
                  className="w-full min-h-[160px] rounded-xl bg-white/85 dark:bg-black/25 border border-fuchsia-200/70 dark:border-white/10 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 shadow-sm resize-none"
                  placeholder="..."
                  value={formData.description}
                  onChange={event => setFormData({ ...formData, description: event.target.value })}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100/70 dark:border-white/10 bg-white/60 dark:bg-black/20 p-5 backdrop-blur-sm space-y-4 relative z-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <LinkIcon size={14} />
                  {t('modal.env_mapping')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    void handleAutoFetch();
                  }}
                  disabled={isFetchingMetadata}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-200/80 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-60"
                >
                  <Wand2 size={12} />
                  {isFetchingMetadata
                    ? (language === 'zh' ? '抓取中...' : 'Fetching...')
                    : t('modal.auto_fetch')}
                </button>
              </div>

              {isSystemDev ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <InputLabel>{t('modal.dev_url')}</InputLabel>
                    <input
                      type="url"
                      className="w-full rounded-xl bg-white/85 dark:bg-black/25 border border-cyan-200/70 dark:border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 shadow-sm"
                      placeholder="https://dev..."
                      value={formData.envConfig?.devUrl}
                      onChange={event =>
                        setFormData({
                          ...formData,
                          envConfig: { ...formData.envConfig!, devUrl: event.target.value },
                        })
                      }
                    />
                  </div>

                  <div>
                    <InputLabel>{t('modal.prod_url')}</InputLabel>
                    <input
                      type="url"
                      className="w-full rounded-xl bg-white/85 dark:bg-black/25 border border-orange-200/70 dark:border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 shadow-sm"
                      placeholder="https://prod..."
                      value={formData.envConfig?.prodUrl}
                      onChange={event =>
                        setFormData({
                          ...formData,
                          envConfig: { ...formData.envConfig!, prodUrl: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <InputLabel>{t('modal.target_url')}</InputLabel>
                  <input
                    type="url"
                    className="w-full rounded-xl bg-white/85 dark:bg-black/25 border border-cyan-200/70 dark:border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 shadow-sm"
                    placeholder="https://..."
                    value={formData.envConfig?.prodUrl}
                    onChange={event =>
                      setFormData({
                        ...formData,
                        envConfig: { devUrl: '', prodUrl: event.target.value },
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-violet-100/70 dark:border-white/10 bg-white/60 dark:bg-black/20 p-5 backdrop-blur-sm">
              <InputLabel>
                <span className="inline-flex items-center gap-2">
                  <Tags size={13} />
                  {t('modal.tags_label')}
                </span>
              </InputLabel>

              <div className="w-full rounded-xl bg-white/80 dark:bg-black/30 border border-violet-200/60 dark:border-white/10 px-4 py-3 min-h-[52px] flex flex-wrap gap-2 items-center shadow-sm focus-within:ring-2 focus-within:ring-violet-500/30">
                {formData.tags?.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-fuchsia-100/90 to-cyan-100/90 dark:from-fuchsia-900/35 dark:to-cyan-900/35 text-fuchsia-700 dark:text-fuchsia-200 border border-white/70 dark:border-white/10"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  className="bg-transparent text-sm font-medium focus:outline-none flex-1 min-w-[120px] dark:text-white placeholder:text-slate-400"
                  placeholder={t('modal.tags_placeholder')}
                  value={tagInput}
                  onChange={event => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-5 border-t border-white/60 dark:border-white/10 bg-gradient-to-r from-white/60 via-fuchsia-50/45 to-cyan-50/45 dark:from-slate-900/50 dark:via-fuchsia-900/20 dark:to-cyan-900/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-white/70 dark:hover:bg-white/10 transition-colors text-sm"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="submit"
            form="add-site-form"
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500 hover:scale-[1.03] shadow-lg shadow-indigo-500/30 transition-all text-sm flex items-center gap-2"
          >
            <Sparkles size={15} />
            <Plus size={15} />
            {t('modal.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSiteModal;
