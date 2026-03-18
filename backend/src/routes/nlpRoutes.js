import express from 'express';
import { analyzeText, batchAnalyzeText, modelInfo } from '../controllers/nlpController.js';

const router = express.Router();

// Public — no auth needed (read-only analysis)
router.get('/model-info', modelInfo);
router.post('/analyze', analyzeText);
router.post('/batch-analyze', batchAnalyzeText);

export default router;
