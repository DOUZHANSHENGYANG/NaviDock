import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { X, Upload, FolderTree, FolderInput } from 'lucide-react';
import { useNavStore } from '../context/NavContext';
import { SiteItem } from '../types';

interface BookmarksImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BookmarkImportItem {
  title: string;
  url: string;
  folders: string[];
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

  const parseBookmarksHtml = (content: string): BookmarkImportItem[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const firstRoot = doc.querySelector('DL');
    if (!firstRoot) return [];

    const records: BookmarkImportItem[] = [];
    const dedupe = new Set<string>();

    const walk = (node: Element, path: string[]) => {
      const children = Array.from(node.children);
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        const tag = child.tagName.toUpperCase();

        if (tag === 'DT') {
          const anchor = child.querySelector(':scope > A');
          if (anchor) {
            const href = (anchor.getAttribute('HREF') || '').trim();
            if (href && !dedupe.has(href)) {
              dedupe.add(href);
              records.push({
                title: (anchor.textContent || href).trim(),
                url: href,
                folders: path,
              });
            }
          }

          const folder = child.querySelector(':scope > H3');
          if (folder) {
            const folderName = (folder.textContent || '').trim() || 'Imported';
            const directNested = child.querySelector(':scope > DL');
            const siblingNested = child.nextElementSibling?.tagName.toUpperCase() === 'DL'
              ? child.nextElementSibling
              : null;
            const nested = directNested || siblingNested;
            if (nested) {
              walk(nested, [...path, folderName]);
            }
          }
          continue;
        }

        if (tag === 'DL') {
          walk(child, path);
        }
      }
    };

    walk(firstRoot, []);
    return records;
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseBookmarksHtml(content);
      setBookmarks(parsed);
      setFileName(file.name);
      if (parsed.length === 0) {
        window.alert(language === 'zh' ? '未解析到有效书签，请确认导出的 HTML 文件格式。' : 'No bookmarks found. Please verify your exported HTML file.');
      }
    } catch (error) {
      console.error('[BookmarksImportModal] Failed to parse bookmarks.', error);
      window.alert(language === 'zh' ? '解析书签文件失败。' : 'Failed to parse bookmark file.');
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

      if (
        (parsed.protocol === 'https:' && parsed.port === '443') ||
        (parsed.protocol === 'http:' && parsed.port === '80')
      ) {
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
    if (categories.some(category => category.id === targetCategoryId)) {
      return targetCategoryId;
    }
    if (categories.some(category => category.id === importCategoryId)) {
      return importCategoryId;
    }
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
          window.alert(language === 'zh' ? '未找到可用分类，请先创建分类。' : 'No available category found. Please create one first.');
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

      window.alert(
        language === 'zh'
          ? `书签导入完成，共导入 ${importedCount} 条，跳过 ${skippedCount} 条重复网址。`
          : `Bookmark import completed. Imported ${importedCount} items and skipped ${skippedCount} duplicates.`,
      );
      onClose();
    } catch (error) {
      console.error('[BookmarksImportModal] Import failed.', error);
      window.alert(language === 'zh' ? '导入失败，请查看控制台日志。' : 'Import failed. Check console logs.');
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
                ? '支持谷歌 Chrome 收藏夹 HTML，兼容多数浏览器导出的书签格式。'
                : 'Supports Google Chrome bookmark HTML and most Netscape bookmark export formats.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/40 dark:hover:bg-white/10 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{t('settings.bookmark_file')}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={openFilePicker}
                className="px-4 py-2.5 rounded-xl bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-100 hover:bg-white/80"
              >
                {t('settings.select_file')}
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{fileName || t('settings.no_file')}</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="text/html,.html"
              className="hidden"
              onChange={event => { void handleFileChange(event); }}
            />
          </div>

          <div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{t('settings.import_mode')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setMode('single')}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${mode === 'single' ? 'border-brand-DEFAULT bg-brand-light/50 text-brand-DEFAULT' : 'border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/20 text-slate-500'}`}
              >
                <div className="font-semibold text-sm">{t('settings.mode_single')}</div>
                <div className="text-xs opacity-80 mt-1">{language === 'zh' ? '默认导入到“导入分类”，可手动切换。' : 'Import into one category (default imported category).'}</div>
              </button>
              <button
                onClick={() => setMode('folder')}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${mode === 'folder' ? 'border-brand-DEFAULT bg-brand-light/50 text-brand-DEFAULT' : 'border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/20 text-slate-500'}`}
              >
                <div className="font-semibold text-sm">{t('settings.mode_folder')}</div>
                <div className="text-xs opacity-80 mt-1">{language === 'zh' ? '可选：按书签目录自动建分类。' : 'Optional: auto-create categories from bookmark folders.'}</div>
              </button>
            </div>
          </div>

          {mode === 'single' && (
            <div>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{t('settings.default_import_category')}</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <select
                  value={targetCategoryId}
                  onChange={event => setTargetCategoryId(event.target.value)}
                  className="w-full bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{t(category.name)}</option>
                  ))}
                </select>
                <button
                  onClick={() => setRememberAsDefault(value => !value)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border ${rememberAsDefault ? 'border-brand-DEFAULT text-brand-DEFAULT bg-brand-light/40' : 'border-white/40 dark:border-white/10 text-slate-500'}`}
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
                  : 'If a URL already exists in database, import will skip that duplicate.'}
              </p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-white/60 dark:hover:bg-white/10">
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            onClick={() => { void runImport(); }}
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
