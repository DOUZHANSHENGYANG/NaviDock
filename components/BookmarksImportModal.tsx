import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { X, Upload, FolderTree, FolderInput } from 'lucide-react';
import { useNavStore } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { SiteItem } from '../types';
import { BookmarkImportItem, parseBrowserBookmarksHtml } from '../services/bookmarkHtml';

interface BookmarksImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookmarksImportModal: React.FC<BookmarksImportModalProps> = ({ isOpen, onClose }) => {
  const {
    categories,
    sites,
    importCategoryId,
    setImportCategory,
    addCategory,
    addSite,
    language,
    t,
  } = useNavStore();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkImportItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState(importCategoryId);
  const [mode, setMode] = useState<'single' | 'folder'>('single');
  const [rememberAsDefault, setRememberAsDefault] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTargetCategoryId(importCategoryId);
    setMode('single');
    setRememberAsDefault(false);
    setBookmarks([]);
    setFileName('');
  }, [isOpen, importCategoryId]);

  const parsedSummary = useMemo(() => {
    if (bookmarks.length === 0) return null;
    const folders = new Set(bookmarks.map(item => item.folders[0] || 'Imported'));
    return {
      total: bookmarks.length,
      folders: folders.size,
    };
  }, [bookmarks]);

  if (!isOpen) return null;

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseBrowserBookmarksHtml(content);
      setBookmarks(parsed);
      setFileName(file.name);

      if (parsed.length === 0) {
        showToast({
          variant: 'warning',
          title: language === 'zh' ? '未解析到书签' : 'No Bookmarks Found',
          message:
            language === 'zh'
              ? '请确认导出的 HTML 文件格式是否正确。'
              : 'Please verify your exported HTML format.',
        });
      }
    } catch (error) {
      console.error('[BookmarksImportModal] Failed to parse bookmarks.', error);
      showToast({
        variant: 'error',
        title: language === 'zh' ? '解析失败' : 'Parse Failed',
        message: language === 'zh' ? '书签文件解析失败。' : 'Failed to parse bookmark file.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const findCategoryByName = (name: string) => {
    const normalized = name.trim().toLowerCase();
    return categories.find(category => {
      const translated = t(category.name).trim().toLowerCase();
      return category.name.trim().toLowerCase() === normalized || translated === normalized;
    });
  };

  const createSiteFromBookmark = (bookmark: BookmarkImportItem, categoryId: string): SiteItem => ({
    id: crypto.randomUUID(),
    title: bookmark.title || bookmark.url,
    description:
      bookmark.folders.length > 0
        ? `${language === 'zh' ? '来自书签文件夹：' : 'Imported from folder: '}${bookmark.folders.join(' / ')}`
        : (language === 'zh' ? '从浏览器书签导入' : 'Imported from browser bookmarks'),
    envConfig: {
      devUrl: '',
      prodUrl: bookmark.url,
    },
    icon: bookmark.icon,
    categoryId,
    tags: ['Bookmark', ...bookmark.folders.slice(0, 2)],
    status: 'online',
    viewType: 'browser',
  });

  const ensureCategory = async (name: string): Promise<string> => {
    const existing = findCategoryByName(name);
    if (existing) return existing.id;
    const created = await addCategory(name);
    return created.id;
  };

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';

    try {
      const parsed = new URL(trimmed);
      parsed.hash = '';

      if ((parsed.protocol === 'https:' && parsed.port === '443') || (parsed.protocol === 'http:' && parsed.port === '80')) {
        parsed.port = '';
      }

      parsed.hostname = parsed.hostname.toLowerCase();
      parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
      parsed.searchParams.sort();
      return parsed.toString();
    } catch {
      return trimmed.toLowerCase();
    }
  };

  const buildExistingUrlSet = () => {
    const existing = new Set<string>();
    for (const site of sites) {
      const prod = normalizeUrl(site.envConfig.prodUrl);
      const dev = normalizeUrl(site.envConfig.devUrl);
      if (prod) existing.add(prod);
      if (dev) existing.add(dev);
    }
    return existing;
  };

  const resolveSingleTargetCategoryId = () => {
    if (categories.some(category => category.id === targetCategoryId)) return targetCategoryId;
    if (categories.some(category => category.id === importCategoryId)) return importCategoryId;
    return categories[0]?.id || '';
  };

  const runImport = async () => {
    if (bookmarks.length === 0) return;

    try {
      setIsImporting(true);
      let importedCount = 0;
      let skippedCount = 0;
      const existingUrls = buildExistingUrlSet();

      if (mode === 'single') {
        const categoryId = resolveSingleTargetCategoryId();
        if (!categoryId) {
          showToast({
            variant: 'warning',
            title: language === 'zh' ? '缺少分类' : 'Category Required',
            message:
              language === 'zh'
                ? '请先创建一个可用分类。'
                : 'Please create an available category first.',
          });
          return;
        }

        for (const bookmark of bookmarks) {
          const normalizedUrl = normalizeUrl(bookmark.url);
          if (!normalizedUrl || existingUrls.has(normalizedUrl)) {
            skippedCount += 1;
            continue;
          }

          await addSite(createSiteFromBookmark(bookmark, categoryId));
          existingUrls.add(normalizedUrl);
          importedCount += 1;
        }

        if (rememberAsDefault && categoryId !== importCategoryId) {
          await setImportCategory(categoryId);
        }
      } else {
        const categoryMapping = new Map<string, string>();

        for (const bookmark of bookmarks) {
          const normalizedUrl = normalizeUrl(bookmark.url);
          if (!normalizedUrl || existingUrls.has(normalizedUrl)) {
            skippedCount += 1;
            continue;
          }

          const folderName = bookmark.folders[0] || (language === 'zh' ? '导入分类' : 'Imported');
          let categoryId = categoryMapping.get(folderName);
          if (!categoryId) {
            categoryId = await ensureCategory(folderName);
            categoryMapping.set(folderName, categoryId);
          }

          await addSite(createSiteFromBookmark(bookmark, categoryId));
          existingUrls.add(normalizedUrl);
          importedCount += 1;
        }
      }

      showToast({
        variant: 'success',
        title: language === 'zh' ? '书签导入完成' : 'Import Completed',
        message:
          language === 'zh'
            ? `共导入 ${importedCount} 条，跳过 ${skippedCount} 条重复网址。`
            : `Imported ${importedCount} items and skipped ${skippedCount} duplicates.`,
      });

      onClose();
    } catch (error) {
      console.error('[BookmarksImportModal] Import failed.', error);
      showToast({
        variant: 'error',
        title: language === 'zh' ? '导入失败' : 'Import Failed',
        message: language === 'zh' ? '请查看控制台日志。' : 'Please check console logs.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-panel w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden">
        <div className="px-8 py-5 border-b border-white/40 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('settings.import_bookmarks')}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'zh'
                ? '支持 Chrome/Netscape 书签 HTML，兼容多数浏览器导出的书签格式。'
                : 'Supports Chrome/Netscape bookmark HTML export formats.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/40 dark:hover:bg-white/10 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar">
          <div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              {t('settings.bookmark_file')}
            </p>
            <div className="flex items-center justify-between gap-3 bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/10 rounded-xl px-4 py-3">
              <button onClick={openFilePicker} className="px-4 py-2 rounded-lg bg-brand-light/50 text-brand-DEFAULT font-semibold text-sm hover:bg-brand-light/70">
                {t('settings.select_file')}
              </button>
              <span className="text-xs text-slate-500 truncate">{fileName || t('settings.no_file')}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="text/html,.html,.htm"
                className="hidden"
                onChange={event => {
                  void handleFileChange(event);
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              {t('settings.import_mode')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setMode('single')}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  mode === 'single'
                    ? 'border-brand-DEFAULT bg-brand-light/50 text-brand-DEFAULT'
                    : 'border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/20 text-slate-500'
                }`}
              >
                <div className="font-semibold text-sm">{t('settings.mode_single')}</div>
                <div className="text-xs opacity-80 mt-1">
                  {language === 'zh' ? '导入到单一分类（可切换默认导入分类）。' : 'Import into one category.'}
                </div>
              </button>

              <button
                onClick={() => setMode('folder')}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  mode === 'folder'
                    ? 'border-brand-DEFAULT bg-brand-light/50 text-brand-DEFAULT'
                    : 'border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/20 text-slate-500'
                }`}
              >
                <div className="font-semibold text-sm">{t('settings.mode_folder')}</div>
                <div className="text-xs opacity-80 mt-1">
                  {language === 'zh' ? '按书签文件夹自动创建/匹配分类。' : 'Auto-create/match categories by folder.'}
                </div>
              </button>
            </div>
          </div>

          {mode === 'single' && (
            <div>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                {t('settings.default_import_category')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <select
                  value={targetCategoryId}
                  onChange={event => setTargetCategoryId(event.target.value)}
                  className="w-full bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {t(category.name)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setRememberAsDefault(value => !value)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border ${
                    rememberAsDefault
                      ? 'border-brand-DEFAULT text-brand-DEFAULT bg-brand-light/40'
                      : 'border-white/40 dark:border-white/10 text-slate-500'
                  }`}
                >
                  {language === 'zh' ? '记住为默认' : 'Remember as default'}
                </button>
              </div>
            </div>
          )}

          {parsedSummary && (
            <div className="glass-card rounded-xl p-4 border border-white/40 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('settings.preview_count')}: <strong>{parsedSummary.total}</strong> {language === 'zh' ? '条网址' : 'bookmarks'}
                {mode === 'folder' && (
                  <span> · <strong>{parsedSummary.folders}</strong> {language === 'zh' ? '个目录' : 'folders'}</span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {language === 'zh'
                  ? '导入时若数据库已存在相同 URL，会自动跳过重复项。'
                  : 'If URL already exists, import will skip duplicates.'}
              </p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-white/60 dark:hover:bg-white/10">
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            onClick={() => {
              void runImport();
            }}
            disabled={isImporting || bookmarks.length === 0}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-slate-900 dark:bg-white dark:text-black disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {mode === 'single' ? <FolderInput size={16} /> : <FolderTree size={16} />}
            {isImporting ? (language === 'zh' ? '导入中...' : 'Importing...') : t('settings.start_import')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookmarksImportModal;
