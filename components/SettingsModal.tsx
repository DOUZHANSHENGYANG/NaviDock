import React, { ChangeEvent, useRef, useState } from 'react';
import { X, Moon, Sun, Download, Upload, Monitor } from 'lucide-react';
import { useNavStore } from '../context/NavContext';
import { Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    exportConfig,
    importConfigFromText,
    isDesktopPersistenceEnabled,
    t,
  } = useNavStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{children}</h3>
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportConfig();
    } catch (error) {
      console.error('[SettingsModal] Export failed.', error);
      window.alert(language === 'zh' ? '导出失败，请查看控制台日志。' : 'Export failed. Please check console logs.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      await importConfigFromText(text);
      window.alert(language === 'zh' ? '配置导入成功。' : 'Configuration imported successfully.');
    } catch (error) {
      console.error('[SettingsModal] Import failed.', error);
      window.alert(language === 'zh' ? '导入失败，请检查 JSON 文件格式。' : 'Import failed. Please verify the JSON file format.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      <div className="relative glass-panel w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="px-8 py-6 border-b border-white/40 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('settings.title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">

          {/* Appearance */}
          <div>
            <SectionTitle>{t('settings.appearance')}</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', icon: Sun, label: t('settings.light') },
                { id: 'dark', icon: Moon, label: t('settings.dark') },
                { id: 'system', icon: Monitor, label: t('settings.system') }
              ].map((opt: any) => (
                <button
                  key={opt.id}
                  onClick={() => { void setTheme(opt.id as Theme); }}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 backdrop-blur-sm
                    ${theme === opt.id
                      ? 'border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/5 text-slate-400'
                    }`}
                >
                  <opt.icon size={24} />
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <SectionTitle>{t('settings.language')}</SectionTitle>
            <div className="flex gap-2 bg-slate-100/50 dark:bg-black/20 p-1 rounded-xl border border-white/20 dark:border-white/5">
              <button
                onClick={() => { void setLanguage('zh'); }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${language === 'zh' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                中文
              </button>
              <button
                onClick={() => { void setLanguage('en'); }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${language === 'en' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                English
              </button>
            </div>
          </div>

          {/* Data */}
          <div>
            <SectionTitle>{t('settings.data_mgmt')}</SectionTitle>
            <div className="space-y-3">
              <button
                onClick={() => { void handleExport(); }}
                disabled={isExporting || isImporting}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed border border-white/40 dark:border-white/10 rounded-xl transition-all text-slate-700 dark:text-gray-200 font-semibold text-sm group backdrop-blur-sm"
              >
                <span className="flex items-center gap-3">
                  <Download size={18} className="text-indigo-500" />
                  {isExporting ? (language === 'zh' ? '导出中...' : 'Exporting...') : t('settings.export')}
                </span>
              </button>
              <button
                onClick={handleOpenImport}
                disabled={isExporting || isImporting}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed border border-white/40 dark:border-white/10 rounded-xl transition-all text-slate-700 dark:text-gray-200 font-semibold text-sm group backdrop-blur-sm"
              >
                <span className="flex items-center gap-3">
                  <Upload size={18} className="text-emerald-500" />
                  {isImporting ? (language === 'zh' ? '导入中...' : 'Importing...') : t('settings.import')}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={event => { void handleImportFileChange(event); }}
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 px-1">
                {isDesktopPersistenceEnabled
                  ? (language === 'zh' ? '桌面模式下会同步导入/导出 SQLite 数据。' : 'Desktop mode exports/imports directly from SQLite data.')
                  : (language === 'zh' ? '浏览器模式下导入/导出仅影响当前会话。' : 'Browser mode import/export affects current session only.')}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
