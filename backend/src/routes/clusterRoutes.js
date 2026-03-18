import express from 'express';
import {
  getAllClusters,
  getClusterById,
  createCluster,
  updateCluster,
  deleteCluster,
  joinCluster,
  leaveCluster,
  getClusterMembers,
  updateMemberLocation,
  getMyClusters,
  autoJoinCluster,
  getNearbyClusters,
  sendAlertToCluster,
  broadcastToCluster,
  getClusterNotifications,
} from '../controllers/clusterController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Utility: admin-only shorthand ────────────────────────────────────────────
const adminOnly = [authenticate, authorize('admin')];

// ── List / discovery (all authenticated users) ───────────────────────────────
router.get('/',        authenticate, getAllClusters);
router.get('/nearby',  getNearbyClusters);                        // public — no auth needed
router.get('/my-clusters', authenticate, getMyClusters);

// ── GPS smart auto-join ───────────────────────────────────────────────────────
router.post('/auto-join', authenticate, autoJoinCluster);

// ── B) Flat join endpoint — POST /api/clusters/join ─────────────────────────
//    Body: { fisherman_id, cluster_id, lat?, lng? }
router.post('/join', authenticate, joinCluster);

// ── Single cluster ────────────────────────────────────────────────────────────
router.get('/:id', authenticate, getClusterById);

// ── A) Create cluster — admin only ───────────────────────────────────────────
router.post('/', ...adminOnly, createCluster);

// ── Update / delete — admin only ─────────────────────────────────────────────
router.put('/:id',    ...adminOnly, updateCluster);
router.delete('/:id', ...adminOnly, deleteCluster);

// ── Membership ───────────────────────────────────────────────────────────────
router.post('/:id/join',            authenticate, joinCluster);        // backward-compat alias
router.delete('/:id/leave',         authenticate, leaveCluster);
router.put('/:id/update-location',  updateMemberLocation);              // called by mobile (no extra auth needed)

// ── D) Fishermen in a cluster ─────────────────────────────────────────────────
router.get('/:id/users',    getClusterMembers);   // primary spec endpoint
router.get('/:id/members',  getClusterMembers);   // backward-compat alias

// ── E) Send alert to cluster — admin only ─────────────────────────────────────
router.post('/:id/alert',     ...adminOnly, sendAlertToCluster);
router.post('/:id/broadcast', broadcastToCluster);   // internal use (border auto-alert)

// ── Read alerts ───────────────────────────────────────────────────────────────
router.get('/:id/notifications', getClusterNotifications);   // alias used by web/mobile UI

export default router;

