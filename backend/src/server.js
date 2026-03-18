import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/database.js';
import { scrapeOceanNews } from './services/newsScraperService.js';
import SocialFeed from './models/SocialFeed.js';
import { analyzeCredibility } from './services/nlpService.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8000;
const SCRAPE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// ── Background RSS scraper task ───────────────────────────────────────────────
async function autoScrapeOceanNews() {
  console.log('[AutoScraper] Starting scheduled RSS scrape...');
  try {
    // Use a system sentinel user id (0 / null) for auto-scraped posts
    const SYSTEM_USER_ID = null;
    const { articles, errors } = await scrapeOceanNews();
    let created = 0; let skipped = 0;
    for (const article of articles) {
      try {
        if (article.sourceUrl) {
          const existing = await SocialFeed.findBySourceUrl(article.sourceUrl);
          if (existing) { skipped++; continue; }
        }
        const post = await SocialFeed.create({
          userId: SYSTEM_USER_ID,
          content: article.content,
          title: article.title,
          hazardType: article.hazardType,
          priority: article.priority,
          source: article.source,
          sourceUrl: article.sourceUrl,
          community: article.community,
          location: null,
        });
        const nlp = analyzeCredibility(`${article.title} ${article.content}`);
        await SocialFeed.updateNlpResult(post.id, nlp.confidence, nlp.label);
        created++;
      } catch { /* skip individual failures */ }
    }
    console.log(`[AutoScraper] Done: ${created} new, ${skipped} duplicate, ${errors.length} feed errors`);
  } catch (err) {
    console.error('[AutoScraper] Unhandled error:', err.message);
  }
}

// Connect to database
connectDB();

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // First scrape 10 seconds after startup, then every 30 minutes
  setTimeout(autoScrapeOceanNews, 10_000);
  setInterval(autoScrapeOceanNews, SCRAPE_INTERVAL_MS);
  console.log('[AutoScraper] Scheduled RSS scraper: first run in 10s, then every 30 min');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});
