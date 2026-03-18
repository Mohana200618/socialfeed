import SocialFeed from '../models/SocialFeed.js';
import Alert from '../models/Alert.js';
import { analyzeCredibility } from '../services/nlpService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ── Priority detection (adapted from HARINI-DS/socialfeed) ────────────────────
function determinePriority(content = '', title = '') {
  const text = `${title} ${content}`.toLowerCase();
  const criticalKeywords = [
    'emergency', 'urgent', 'warning', 'danger', 'evacuate',
    'tsunami', 'storm surge', 'cyclone', 'alert', 'critical',
    'immediate', 'hazard', 'severe', 'extreme', 'disaster', 'catastrophic'
  ];
  const highKeywords = [
    'watch', 'caution', 'high waves', 'rough seas', 'gale', 'flood',
    'storm', 'heavy rain', 'strong winds', 'advisory', 'elevated'
  ];
  if (criticalKeywords.some(kw => text.includes(kw))) return 'critical';
  if (highKeywords.some(kw => text.includes(kw))) return 'high';
  return 'normal';
}

// ── Hazard type detection ─────────────────────────────────────────────────────
function detectHazardType(content = '', title = '') {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('tsunami')) return 'tsunami';
  if (text.includes('storm surge') || text.includes('storm_surge')) return 'storm_surge';
  if (text.includes('cyclone')) return 'cyclone';
  if (text.includes('high waves') || text.includes('high_waves')) return 'high_waves';
  if (text.includes('flood')) return 'flooding';
  if (text.includes('weather') || text.includes('rain') || text.includes('wind')) return 'weather';
  if (text.includes('emergency')) return 'emergency';
  return 'unspecified';
}

export const getAllPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const posts = await SocialFeed.findAll(limit);
  res.json({ success: true, data: posts });
});

export const getPostById = asyncHandler(async (req, res) => {
  const post = await SocialFeed.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  res.json({ success: true, data: post });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const posts = await SocialFeed.findByUserId(req.params.userId);
  res.json({ success: true, data: posts });
});

export const createPost = asyncHandler(async (req, res) => {
  const { title, content, hazardType, location, community, source, sourceUrl, imageUrl } = req.body;

  // Auto-detect priority and hazard type if not explicitly provided
  const priority = req.body.priority || determinePriority(content, title);
  const resolvedHazardType = hazardType || detectHazardType(content, title);

  const postData = {
    userId: req.user.id,
    content,
    imageUrl,
    title,
    hazardType: resolvedHazardType,
    priority,
    location,
    community,
    source: source || 'community_report',
    sourceUrl
  };

  const post = await SocialFeed.create(postData);

  // Auto-analyze with NLP in the background (non-blocking)
  const textToAnalyze = [title, content].filter(Boolean).join(' ');
  if (textToAnalyze.trim()) {
    try {
      const result = analyzeCredibility(textToAnalyze);
      SocialFeed.updateNlpResult(post.id, result.confidence, result.label).catch(() => {});
    } catch {/* silently ignore NLP errors */}
  }

  res.status(201).json({ success: true, data: post });
});

// Admin: get all posts with NLP review data
export const getAllPostsWithNlp = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const posts = await SocialFeed.findAllWithNlp(limit);
  res.json({ success: true, data: posts });
});

// Admin: posts with confidence >= 80 awaiting action
export const getPendingAlerts = asyncHandler(async (req, res) => {
  const posts = await SocialFeed.findPendingAlerts();
  res.json({ success: true, data: posts });
});

// Admin: promote a high-confidence post to an official alert
export const promoteToAlert = asyncHandler(async (req, res) => {
  const post = await SocialFeed.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
  if ((post.nlp_confidence || 0) < 80) {
    return res.status(400).json({ success: false, error: 'Post confidence below 80% — cannot promote to alert' });
  }

  const { alertType = 'warning', severity = 'yellow', location = '' } = req.body;
  const alert = await Alert.create({
    title: `[Social] ${(post.content || '').slice(0, 80)}`,
    description: post.content,
    alertType,
    severity,
    location,
    createdBy: req.user.id
  });

  await SocialFeed.markAlertSent(post.id);
  res.status(201).json({ success: true, data: alert, message: 'Alert created from post' });
});

// Admin: dismiss a flagged post
export const dismissPost = asyncHandler(async (req, res) => {
  const post = await SocialFeed.dismiss(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
  res.json({ success: true, data: post, message: 'Post dismissed' });
});

// Admin: run NLP on every post that has no score yet
export const analyzeAllPosts = asyncHandler(async (req, res) => {
  const posts = await SocialFeed.findAllWithNlp(500);
  const unscored = posts.filter(p => p.nlp_confidence == null);

  const updated = [];
  for (const post of unscored) {
    try {
      const textToAnalyze = [post.title, post.content].filter(Boolean).join(' ');
      if (!textToAnalyze.trim()) continue;
      const result = analyzeCredibility(textToAnalyze);
      await SocialFeed.updateNlpResult(post.id, result.confidence, result.label);
      updated.push({ id: post.id, confidence: result.confidence, label: result.label });
    } catch { /* skip failed posts */ }
  }

  res.json({ success: true, analyzed: updated.length, total: posts.length, data: updated });
});

import { scrapeOceanNews } from '../services/newsScraperService.js';

// Admin: fetch live ocean hazard news from RSS feeds and store as posts
export const scrapeNewsAuto = asyncHandler(async (req, res) => {
  const { articles, errors } = await scrapeOceanNews();

  if (articles.length === 0) {
    return res.json({
      success: true,
      message: 'No new ocean hazard articles found from RSS feeds right now.',
      created: 0,
      skipped: 0,
      feedErrors: errors,
    });
  }

  const created = [];
  let skipped = 0;

  for (const article of articles) {
    try {
      // Skip duplicates by source URL
      if (article.sourceUrl) {
        const existing = await SocialFeed.findBySourceUrl(article.sourceUrl);
        if (existing) { skipped++; continue; }
      }

      const post = await SocialFeed.create({
        userId: req.user.id,
        content: article.content,
        title: article.title,
        hazardType: article.hazardType,
        priority: article.priority,
        source: article.source,
        sourceUrl: article.sourceUrl,
        community: article.community,
        location: null,
      });

      // Run NLP on the article
      const nlp = analyzeCredibility(`${article.title} ${article.content}`);
      await SocialFeed.updateNlpResult(post.id, nlp.confidence, nlp.label);
      created.push(post.id);
    } catch { /* skip individual failures */ }
  }

  res.json({
    success: true,
    message: `Fetched ${articles.length} articles from RSS feeds. Added ${created.length} new posts (${skipped} duplicates skipped).`,
    created: created.length,
    skipped,
    total: articles.length,
    feedErrors: errors,
  });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await SocialFeed.update(req.params.id, req.body);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  res.json({ success: true, data: post });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await SocialFeed.delete(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  res.json({ success: true, message: 'Post deleted successfully' });
});
