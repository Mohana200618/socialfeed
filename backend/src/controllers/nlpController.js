import { analyzeCredibility, batchAnalyze } from '../services/nlpService.js';

/**
 * POST /api/nlp/analyze
 * Body: { "text": "...", "title": "..." (optional) }
 */
export const analyzeText = async (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Field "text" is required and must be a non-empty string.' });
    }
    const fullText = title ? `${title.trim()}. ${text.trim()}` : text.trim();
    const result = analyzeCredibility(fullText);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/nlp/batch-analyze
 * Body: { "items": [{ "id": 1, "text": "...", "title": "..." }] }
 */
export const batchAnalyzeText = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Field "items" must be a non-empty array.' });
    }
    if (items.length > 50) {
      return res.status(400).json({ success: false, error: 'Maximum 50 items per batch request.' });
    }
    const results = batchAnalyze(items);
    return res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/nlp/model-info
 * Returns info about the model and training corpus.
 */
export const modelInfo = (_req, res) => {
  return res.json({
    success: true,
    data: {
      model: 'Naive Bayes Classifier (natural.js)',
      algorithm: 'Multinomial Naive Bayes + Linguistic Feature Extraction',
      trainingExamples: { credible: 20, non_credible: 20 },
      features: [
        'Naive Bayes text classification (35% weight)',
        'Specificity score — numbers, dates, coordinates, measurements (25%)',
        'Attribution score — official sources, authority references (20%)',
        'Structure score — formality, sentence length, word complexity (10%)',
        'Sentiment neutrality — emotional tone analysis via AFINN (10%)',
        'Alarmism penalty — CAPS, !!!!, sensational words (-25% max)',
        'Hedging penalty — rumours, unverified claims, forwards (-20% max)',
      ],
      outputLabels: { HIGH: '80–100', MEDIUM: '50–79', LOW: '0–49' },
    },
  });
};
