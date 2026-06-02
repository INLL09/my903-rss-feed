# my903 RSS Feed

This repository generates an RSS feed for my903.com from the public JSON article API.

Feed URL:

```text
https://raw.githubusercontent.com/INLL09/my903-rss-feed/main/my903-rss.xml
```

Update locally:

```powershell
node .\my903-rss-generator.mjs --limit 50 --output .\my903-rss.xml
```

GitHub Actions refreshes the feed every 3 hours and only commits when the generated RSS changes.
