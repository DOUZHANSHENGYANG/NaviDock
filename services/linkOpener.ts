import { desktopApi } from './desktopApi';

export const openSiteLink = async (url: string, title?: string): Promise<void> => {
  const target = url.trim();
  if (!target) return;

  if (desktopApi.isEnabled) {
    try {
      await desktopApi.openSiteWindow(target, title);
      return;
    } catch (error) {
      console.error('[linkOpener] Failed to open internal site window, fallback to browser.', error);
    }
  }

  window.open(target, '_blank', 'noopener,noreferrer');
};
