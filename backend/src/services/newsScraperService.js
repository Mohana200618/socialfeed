/**
 * Real-time Ocean Hazard News Scraper
 * Fetches live news from free RSS feeds - no API key required.
 * Sources: Google News (ocean/hazard query), BBC Science, NOAA NHC, ReliefWeb
 */

import Parser from 'rss-parser';
import axios from 'axios';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; BlueOceanSafetyApp/1.0; +https://blue-safety.app)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  timeout: 10000,
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure'],
  },
});

// ── Free RSS feed sources ─────────────────────────────────────────────────────
const RSS_FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=tsunami+OR+cyclone+OR+"storm+surge"+OR+"coastal+warning"+OR+"fisherme"+OR+"high+waves"+OR+"sea+warning"&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'google_news_india',
    label: 'Google News India',
  },
  {
    url: 'https://news.google.com/rss/search?q=tsunami+OR+cyclone+OR+hurricane+OR+"storm+surge"+OR+"coastal+flood"+OR+"ocean+warning"&hl=en&gl=US&ceid=US:en',
    source: 'google_news_global',
    label: 'Google News Global',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    source: 'bbc_science',
    label: 'BBC Science & Environment',
  },
  {
    url: 'https://www.nhc.noaa.gov/index-at.xml',
    source: 'noaa_nhc',
    label: 'NOAA National Hurricane Center',
  },
  {
    url: 'https://reliefweb.int/updates/rss.xml?advanced-search=(PC110)',
    source: 'reliefweb',
    label: 'ReliefWeb Ocean Hazards',
  },
];

// Ocean/coastal hazard filter keywords - article must contain at least one
const OCEAN_KEYWORDS = [
  'tsunami', 'cyclone', 'hurricane', 'typhoon', 'storm surge', 'tidal wave',
  'coastal flood', 'ocean warning', 'sea warning', 'fishermen', 'fishing ban',
  'high waves', 'rough sea', 'gale warning', 'maritime alert', 'coastal hazard',
  'monsoon', 'coastal erosion', 'sea level', 'deep sea', 'underwater earthquake',
  'bay of bengal', 'arabian sea', 'indian ocean', 'coral reef', 'marine',
  'flood warning', 'storm warning', 'wave alert', 'evacuation coastal',
];

// ── Helper functions ──────────────────────────────────────────────────────────

function isOceanRelated(title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  return OCEAN_KEYWORDS.some(kw => text.includes(kw));
}

function detectHazardType(title = '', content = '') {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('tsunami')) return 'tsunami';
  if (text.includes('storm surge') || text.includes('surge')) return 'storm_surge';
  if (text.includes('cyclone') || text.includes('hurricane') || text.includes('typhoon')) return 'cyclone';
  if (text.includes('high wave') || text.includes('rough sea') || text.includes('wave alert')) return 'high_waves';
  if (text.includes('flood')) return 'flooding';
  if (text.includes('gale') || text.includes('wind') || text.includes('rain') || text.includes('monsoon') || text.includes('weather')) return 'weather';
  if (text.includes('emergency') || text.includes('evacuate') || text.includes('evacuation')) return 'emergency';
  return 'unspecified';
}

function determinePriority(title = '', content = '') {
  const text = `${title} ${content}`.toLowerCase();
  const criticalKw = ['emergency', 'urgent', 'warning', 'danger', 'evacuate', 'tsunami',
    'storm surge', 'cyclone', 'alert', 'critical', 'immediate', 'severe', 'extreme', 'catastrophic', 'disaster'];
  const highKw = ['watch', 'caution', 'high waves', 'rough sea', 'gale', 'flood', 'storm',
    'heavy rain', 'strong winds', 'advisory', 'elevated', 'hurricane', 'typhoon'];
  if (criticalKw.some(kw => text.includes(kw))) return 'critical';
  if (highKw.some(kw => text.includes(kw))) return 'high';
  return 'normal';
}

function cleanText(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')   // strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Main scraper function ─────────────────────────────────────────────────────

/**
 * Scrapes all RSS feeds and returns filtered ocean hazard articles.
 * @returns {Promise<Array>} Array of article objects ready to be stored as posts
 */
export async function scrapeOceanNews() {
  const articles = [];
  const errors = [];

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`[NewsScraperService] Fetching: ${feed.label}`);
      const result = await parser.parseURL(feed.url);

      for (const item of (result.items || []).slice(0, 20)) {
        const title = cleanText(item.title || '');
        const content = cleanText(item.contentSnippet || item.content || item.summary || '');
        const link = item.link || item.guid || '';
        const pubDate = item.pubDate || item.isoDate || new Date().toISOString();

        if (!title) continue;
        if (!isOceanRelated(title, content)) continue;

        articles.push({
          title,
          content: content || title,
          sourceUrl: link,
          source: feed.source,
          community: feed.label,
          hazardType: detectHazardType(title, content),
          priority: determinePriority(title, content),
          publishedAt: new Date(pubDate).toISOString(),
        });
      }

      console.log(`[NewsScraperService] ${feed.label}: fetched ${result.items?.length || 0} items`);
    } catch (err) {
      const msg = `[NewsScraperService] Failed to fetch ${feed.label}: ${err.message}`;
      console.warn(msg);
      errors.push(msg);
    }
  }

  // De-duplicate by URL
  const seen = new Set();
  const unique = articles.filter(a => {
    if (!a.sourceUrl || seen.has(a.sourceUrl)) return false;
    seen.add(a.sourceUrl);
    return true;
  });

  console.log(`[NewsScraperService] Scraped ${unique.length} unique ocean hazard articles from ${RSS_FEEDS.length} feeds`);
  return { articles: unique, errors };
}

/**
 * Returns a quick status of which feeds are reachable (for diagnostics).
 */
export async function checkFeeds() {
  const results = [];
  for (const feed of RSS_FEEDS) {
    try {
      await axios.head(feed.url, { timeout: 5000 });
      results.push({ label: feed.label, status: 'ok' });
    } catch {
      results.push({ label: feed.label, status: 'unreachable' });
    }
  }
  return results;
}
