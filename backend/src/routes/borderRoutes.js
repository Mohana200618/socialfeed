import express from 'express';
import { checkBorderStatus } from '../services/borderService.js';
import { BORDER_POINTS, THRESHOLDS } from '../config/borderConfig.js';
import Cluster from '../models/Cluster.js';

const router = express.Router();

/**
 * GET /api/border/check-border?lat=9.50&lng=79.90
 * POST /api/border/check-border  body: { "lat": 9.50, "lng": 79.90, "userId": 5 }
 *
 * If userId is provided and status is DANGER or WARNING, automatically
 * broadcasts a notification to all clusters the user belongs to.
 */
const handleCheckBorder = async (req, res) => {
  const lat = req.body?.lat ?? req.query?.lat;
  const lng = req.body?.lng ?? req.query?.lng;
  const userId = req.body?.userId ?? req.query?.userId ?? null;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'lat and lng are required.' });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({ success: false, error: 'lat and lng must be valid numbers.' });
  }

  if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    return res.status(400).json({ success: false, error: 'lat must be between -90 and 90; lng between -180 and 180.' });
  }

  const result = checkBorderStatus(parsedLat, parsedLng);

  // Auto-broadcast to cluster if user is known and in danger / warning
  let clustersBroadcast = [];
  if (userId && (result.status === 'DANGER' || result.status === 'WARNING')) {
    try {
      const userClusters = await Cluster.getMemberClusters(parseInt(userId));
      for (const cluster of userClusters) {
        const emoji = result.status === 'DANGER' ? '🚨' : '⚠️';
        const msg = `${emoji} ${result.status} — Cluster member is ${result.distanceKm} km from the border near ${result.nearestBorderPoint}. ${result.escapeInstruction}`;
        await Cluster.broadcastNotification(cluster.id, msg, result.status, parseInt(userId), parsedLat, parsedLng);
        // Update location
        await Cluster.updateMemberLocation(parseInt(userId), cluster.id, parsedLat, parsedLng);
        clustersBroadcast.push(cluster.id);
      }
    } catch (e) {
      // Non-fatal — don't fail the border check if cluster broadcast fails
      console.warn('Cluster broadcast error:', e.message);
    }
  }

  return res.status(200).json({ success: true, data: result, clustersBroadcast });
};

router.post('/check-border', handleCheckBorder);
router.get('/check-border', handleCheckBorder);

router.get('/points', (_req, res) => {
  res.json({ success: true, data: { borderPoints: BORDER_POINTS, thresholds: THRESHOLDS } });
});

export default router;
