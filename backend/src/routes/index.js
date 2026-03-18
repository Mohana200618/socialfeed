import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import alertRoutes from './alertRoutes.js';
import incidentRoutes from './incidentRoutes.js';
import socialFeedRoutes from './socialFeedRoutes.js';
import clusterRoutes from './clusterRoutes.js';
import fishingZoneRoutes from './fishingZoneRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import borderRoutes from './borderRoutes.js';
import pfzRoutes from './pfzRoutes.js';
import nlpRoutes from './nlpRoutes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/alerts', alertRoutes);
router.use('/incidents', incidentRoutes);
router.use('/social-feed', socialFeedRoutes);
router.use('/clusters', clusterRoutes);
router.use('/fishing-zones', fishingZoneRoutes);
router.use('/settings', settingsRoutes);
router.use('/border', borderRoutes);
router.use('/pfz', pfzRoutes);
router.use('/nlp', nlpRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Fisherman Safety API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      alerts: '/api/alerts',
      incidents: '/api/incidents',
      socialFeed: '/api/social-feed',
      clusters: '/api/clusters',
      fishingZones: '/api/fishing-zones',
      settings: '/api/settings',
      border: '/api/border',
      health: '/health'
    }
  });
});

export default router;
