import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DEFAULT_LIMIT = 20;
const SITE_URL = 'https://www.my903.com/';

export function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function articleUrl(article) {
  return new URL(`/article/${article.item_id}`, SITE_URL).toString();
}

function category(article) {
  return [article.parent_article_column?.name, article.article_column?.name]
    .filter(Boolean)
    .join(' / ');
}

function pubDate(article) {
  if (article.display_ts) {
    return new Date(Number(article.display_ts) * 1000).toUTCString();
  }
  if (article.display_date) {
    return new Date(`${article.display_date}T00:00:00+08:00`).toUTCString();
  }
  return new Date().toUTCString();
}

function newestPubDate(articles) {
  const timestamps = articles
    .map((article) => Number(article.display_ts))
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);

  if (timestamps.length > 0) {
    return new Date(Math.max(...timestamps) * 1000).toUTCString();
  }

  return new Date(0).toUTCString();
}

export function buildRss({ feedTitle, feedLink, feedDescription, articles }) {
  const items = articles
    .map((article) => {
      const link = articleUrl(article);
      const itemCategory = category(article);
      const categoryTag = itemCategory
        ? `      <category>${escapeXml(itemCategory)}</category>\n`
        : '';

      return [
        '    <item>',
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${escapeXml(pubDate(article))}</pubDate>`,
        categoryTag.trimEnd(),
        `      <description>${escapeXml(article.preview_content || '')}</description>`,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(feedTitle)}</title>`,
    `    <link>${escapeXml(feedLink)}</link>`,
    `    <description>${escapeXml(feedDescription)}</description>`,
    `    <lastBuildDate>${escapeXml(newestPubDate(articles))}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

export async function fetchArticles({ limit = DEFAULT_LIMIT, articleColumnId } = {}) {
  const apiUrl = new URL('/api/article/list', SITE_URL);
  apiUrl.searchParams.set('limit', String(limit));
  if (articleColumnId) {
    apiUrl.searchParams.set('article_column_id', String(articleColumnId));
  }

  const response = await fetch(apiUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': 'my903-rss-generator/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`my903 API returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.response_code !== 200 || !Array.isArray(payload.response?.content)) {
    throw new Error('my903 API returned an unexpected payload');
  }

  return payload.response.content;
}

function parseArgs(argv) {
  const args = {
    limit: DEFAULT_LIMIT,
    output: 'my903-rss.xml',
    articleColumnId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--limit' && next) {
      args.limit = Number(next);
      index += 1;
    } else if (arg === '--output' && next) {
      args.output = next;
      index += 1;
    } else if (arg === '--column' && next) {
      args.articleColumnId = Number(next);
      index += 1;
    }
  }

  if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 200) {
    throw new Error('--limit must be an integer from 1 to 200');
  }
  if (args.articleColumnId !== null && !Number.isInteger(args.articleColumnId)) {
    throw new Error('--column must be an integer article_column_id');
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const articles = await fetchArticles({
    limit: args.limit,
    articleColumnId: args.articleColumnId,
  });
  const xml = buildRss({
    feedTitle: args.articleColumnId
      ? `my903.com column ${args.articleColumnId}`
      : 'my903.com latest',
    feedLink: args.articleColumnId
      ? `${SITE_URL}column/${args.articleColumnId}`
      : SITE_URL,
    feedDescription: args.articleColumnId
      ? `Latest my903.com articles for column ${args.articleColumnId}`
      : 'Latest my903.com articles',
    articles,
  });

  await writeFile(args.output, xml, 'utf8');
  console.log(`Wrote ${articles.length} items to ${args.output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
