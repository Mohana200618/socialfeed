import express from 'express';
import { 
  getAllPosts, 
  getPostById, 
  getUserPosts,
  createPost, 
  updatePost, 
  deletePost,
  getAllPostsWithNlp,
  getPendingAlerts,
  promoteToAlert,
  dismissPost,
  analyzeAllPosts,
  scrapeNewsAuto
} from '../controllers/socialFeedController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Admin NLP review routes (must be before /:id)
router.get('/admin/review', authenticate, getAllPostsWithNlp);
router.get('/admin/pending-alerts', authenticate, getPendingAlerts);
router.post('/admin/analyze-all', authenticate, analyzeAllPosts);
router.post('/admin/scrape-news', authenticate, scrapeNewsAuto);
router.post('/admin/:id/promote', authenticate, promoteToAlert);
router.post('/admin/:id/dismiss', authenticate, dismissPost);

router.get('/', authenticate, getAllPosts);
router.get('/user/:userId', authenticate, getUserPosts);
router.get('/:id', authenticate, getPostById);
router.post('/', authenticate, createPost);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);

export default router;
