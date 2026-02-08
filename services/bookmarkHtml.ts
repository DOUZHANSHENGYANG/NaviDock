import type { Category, SiteItem } from '../types';

export interface BookmarkImportItem {
  title: string;
  url: string;
  folders: string[];
  icon?: string;
}

interface BuildBookmarksHtmlOptions {
  rootFolderName?: string;
  resolveCategoryName?: (category: Category) => string;
}

const BOOKMARK_TOKEN_REGEX =
  /<DT\b[^>]*>\s*<H3\b[^>]*>([\s\S]*?)<\/H3>|<H3\b[^>]*>([\s\S]*?)<\/H3>|<A\b([^>]*)>([\s\S]*?)<\/A>|<DL\b[^>]*>|<\/DL>/gi;

const HREF_ATTR_REGEX = /\bHREF\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const ICON_ATTR_REGEX = /\bICON\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const ICON_URI_ATTR_REGEX = /\bICON_URI\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const MAX_INLINE_BOOKMARK_ICON_LENGTH = 200_000;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '');

const decodeHtmlEntities = (value: string) => {
  const stripped = stripTags(value).trim();
  if (!stripped) return '';

  if (typeof document === 'undefined') {
    return stripped
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = stripped;
  return textarea.value.trim();
};

const parseHrefFromAnchorAttrs = (anchorAttrs: string) => {
  const hrefMatch = anchorAttrs.match(HREF_ATTR_REGEX);
  if (!hrefMatch) return '';

  const rawHref = hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '';
  return decodeHtmlEntities(rawHref).trim();
};

const parseIconFromAnchorAttrs = (anchorAttrs: string) => {
  const iconMatch = anchorAttrs.match(ICON_ATTR_REGEX) || anchorAttrs.match(ICON_URI_ATTR_REGEX);
  if (!iconMatch) return '';

  const rawIcon = iconMatch[1] ?? iconMatch[2] ?? iconMatch[3] ?? '';
  return decodeHtmlEntities(rawIcon).trim();
};

const buildFaviconServiceUrl = (href: string) => {
  try {
    const { hostname } = new URL(href);
    if (!hostname) return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return '';
  }
};

const normalizeBookmarkIcon = (rawIcon: string, href: string) => {
  const normalized = rawIcon.trim();
  if (!normalized) {
    return buildFaviconServiceUrl(href);
  }

  if (/^data:image\//i.test(normalized)) {
    return normalized.length <= MAX_INLINE_BOOKMARK_ICON_LENGTH
      ? normalized
      : buildFaviconServiceUrl(href);
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('//')) {
    return `https:${normalized}`;
  }

  try {
    return new URL(normalized, href).toString();
  } catch {
    return buildFaviconServiceUrl(href);
  }
};

const resolveBookmarkUrl = (site: SiteItem) => {
  const prod = site.envConfig.prodUrl.trim();
  if (prod) return prod;

  const dev = site.envConfig.devUrl.trim();
  return dev;
};

export const parseBrowserBookmarksHtml = (content: string): BookmarkImportItem[] => {
  if (!content || !/<A\b/i.test(content)) return [];

  const records: BookmarkImportItem[] = [];
  const dedupe = new Set<string>();
  const folderStack: string[] = [];
  const dlFolderStack: boolean[] = [];
  let pendingFolder: string | null = null;

  let match: RegExpExecArray | null;
  while ((match = BOOKMARK_TOKEN_REGEX.exec(content)) !== null) {
    const token = match[0];

    if (/^<DL\b/i.test(token)) {
      if (pendingFolder) {
        folderStack.push(pendingFolder);
        dlFolderStack.push(true);
        pendingFolder = null;
      } else {
        dlFolderStack.push(false);
      }
      continue;
    }

    if (/^<\/DL\b/i.test(token)) {
      const closedFolderLayer = dlFolderStack.pop();
      if (closedFolderLayer) {
        folderStack.pop();
      }
      pendingFolder = null;
      continue;
    }

    const folderNameCandidate = match[1] ?? match[2];
    if (folderNameCandidate !== undefined) {
      pendingFolder = decodeHtmlEntities(folderNameCandidate) || 'Imported';
      continue;
    }

    if (match[3] !== undefined) {
      const href = parseHrefFromAnchorAttrs(match[3]);
      if (!href || dedupe.has(href)) {
        pendingFolder = null;
        continue;
      }

      dedupe.add(href);
      const title = decodeHtmlEntities(match[4] ?? '') || href;
      const icon = normalizeBookmarkIcon(parseIconFromAnchorAttrs(match[3]), href);
      records.push({
        title,
        url: href,
        folders: [...folderStack],
        icon: icon || undefined,
      });
      pendingFolder = null;
    }
  }

  return records;
};

export const buildBrowserBookmarksHtml = (
  sites: SiteItem[],
  categories: Category[],
  options: BuildBookmarksHtmlOptions = {},
) => {
  const now = Math.floor(Date.now() / 1000);
  const resolveCategoryName =
    options.resolveCategoryName ??
    ((category: Category) => category.name);
  const rootFolderName = (options.rootFolderName || 'NaviDock Bookmarks').trim() || 'NaviDock Bookmarks';

  const categoryMap = new Map(categories.map(category => [category.id, category] as const));
  const grouped = new Map<string, Array<{ title: string; url: string; icon?: string }>>();

  for (const site of sites) {
    const url = resolveBookmarkUrl(site);
    if (!url) continue;

    const category = categoryMap.get(site.categoryId);
    const folderName = category
      ? (resolveCategoryName(category).trim() || 'Imported')
      : 'Uncategorized';

    const bucket = grouped.get(folderName) || [];
    bucket.push({
      title: site.title.trim() || url,
      url,
      icon: normalizeBookmarkIcon(site.icon?.trim() || '', url) || undefined,
    });
    grouped.set(folderName, bucket);
  }

  const orderedGroups = Array.from(grouped.entries())
    .map(([folderName, bookmarks]) => [
      folderName,
      bookmarks.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    ] as const)
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, undefined, { sensitivity: 'base' }));

  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    `    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(rootFolderName)}</H3>`,
    '    <DL><p>',
  ];

  for (const [folderName, bookmarks] of orderedGroups) {
    lines.push(`        <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(folderName)}</H3>`);
    lines.push('        <DL><p>');

    for (const bookmark of bookmarks) {
      const iconAttribute = bookmark.icon ? ` ICON="${escapeHtml(bookmark.icon)}"` : '';
      lines.push(
        `            <DT><A HREF="${escapeHtml(bookmark.url)}"${iconAttribute} ADD_DATE="${now}">${escapeHtml(bookmark.title)}</A>`,
      );
    }

    lines.push('        </DL><p>');
  }

  lines.push('    </DL><p>');
  lines.push('</DL><p>');

  return lines.join('\n');
};
