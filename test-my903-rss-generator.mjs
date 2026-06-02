import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRss } from './my903-rss-generator.mjs';

test('buildRss converts my903 article list entries into RSS items', () => {
  const xml = buildRss({
    feedTitle: 'my903.com latest',
    feedLink: 'https://www.my903.com/',
    feedDescription: 'Latest my903.com articles',
    articles: [
      {
        item_id: 6048,
        title: 'Gordon Flanders - 溝之口 沒有 藤井風',
        preview_content: 'City Pop & sweet <daily> romance',
        display_ts: 1768377900,
        article_column: { name: '派台歌' },
        parent_article_column: { name: '叱咤咤' },
      },
    ],
  });

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2.0">/);
  assert.match(xml, /<title>Gordon Flanders - 溝之口 沒有 藤井風<\/title>/);
  assert.match(xml, /<link>https:\/\/www\.my903\.com\/article\/6048<\/link>/);
  assert.match(xml, /City Pop &amp; sweet &lt;daily&gt; romance/);
  assert.match(xml, /<category>叱咤咤 \/ 派台歌<\/category>/);
});

test('buildRss uses the newest article timestamp as lastBuildDate', () => {
  const xml = buildRss({
    feedTitle: 'my903.com latest',
    feedLink: 'https://www.my903.com/',
    feedDescription: 'Latest my903.com articles',
    articles: [
      { item_id: 1, title: 'Older', display_ts: 1000 },
      { item_id: 2, title: 'Newer', display_ts: 2000 },
    ],
  });

  assert.match(xml, /<lastBuildDate>Thu, 01 Jan 1970 00:33:20 GMT<\/lastBuildDate>/);
});
