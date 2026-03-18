import Cluster from '../models/Cluster.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// A) GET /api/clusters          — list all clusters with member count
// ─────────────────────────────────────────────────────────────────────────────
export const getAllClusters = asyncHandler(async (req, res) => {
  const clusters = await Cluster.findAll();
  res.json({ success: true, data: clusters });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clusters/:id         — single cluster
// ─────────────────────────────────────────────────────────────────────────────
export const getClusterById = asyncHandler(async (req, res) => {
  const cluster = await Cluster.findById(req.params.id);
  if (!cluster) return res.status(404).json({ success: false, error: 'Cluster not found' });
  res.json({ success: true, data: cluster });
});

// ─────────────────────────────────────────────────────────────────────────────
// A) POST /api/clusters         — create cluster (admin only)
// Body: { name, latitude, longitude, radius_km, description?, location? }
// ─────────────────────────────────────────────────────────────────────────────
export const createCluster = asyncHandler(async (req, res) => {
  const { name, latitude, longitude, radius_km, description, location } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });
  if (latitude == null || longitude == null)
    return res.status(400).json({ success: false, error: 'latitude and longitude are required' });

  const cluster = await Cluster.create({
    name,
    description: description ?? null,
    location: location ?? null,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    radius_km: radius_km != null ? parseFloat(radius_km) : 50,
    coordinatorId: req.user?.id ?? null,
  });
  res.status(201).json({ success: true, data: cluster });
});

export const updateCluster = asyncHandler(async (req, res) => {
  const cluster = await Cluster.update(req.params.id, req.body);
  if (!cluster) return res.status(404).json({ success: false, error: 'Cluster not found' });
  res.json({ success: true, data: cluster });
});

export const deleteCluster = asyncHandler(async (req, res) => {
  const cluster = await Cluster.delete(req.params.id);
  if (!cluster) return res.status(404).json({ success: false, error: 'Cluster not found' });
  res.json({ success: true, message: 'Cluster deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// B) POST /api/clusters/join    — fisherman joins a cluster
// Body: { fisherman_id, cluster_id, lat?, lng? }
// Also aliased as POST /api/clusters/:id/join for backward compat
// ─────────────────────────────────────────────────────────────────────────────
export const joinCluster = asyncHandler(async (req, res) => {
  // Support both flat body {fisherman_id, cluster_id} and :id param route
  const fishermanId = req.body.fisherman_id ?? req.body.userId;
  const clusterId   = req.params.id ?? req.body.cluster_id;
  const lat         = req.body.lat ?? null;
  const lng         = req.body.lng ?? null;

  if (!fishermanId) return res.status(400).json({ success: false, error: 'fisherman_id is required' });
  if (!clusterId)   return res.status(400).json({ success: false, error: 'cluster_id is required' });

  const cluster = await Cluster.findById(clusterId);
  if (!cluster) return res.status(404).json({ success: false, error: 'Cluster not found' });

  const member = await Cluster.joinCluster(parseInt(fishermanId), parseInt(clusterId), lat, lng);
  res.status(201).json({
    success: true,
    message: `Fisherman ${fishermanId} joined cluster "${cluster.name}"`,
    data: member,
  });
});

// DELETE /api/clusters/:id/leave
export const leaveCluster = asyncHandler(async (req, res) => {
  const fishermanId = req.body.fisherman_id ?? req.body.userId;
  if (!fishermanId) return res.status(400).json({ success: false, error: 'fisherman_id is required' });
  await Cluster.leaveCluster(parseInt(fishermanId), req.params.id);
  res.json({ success: true, message: 'Left cluster' });
});

// ─────────────────────────────────────────────────────────────────────────────
// D) GET /api/clusters/:id/users  — all fishermen in a cluster
// ─────────────────────────────────────────────────────────────────────────────
export const getClusterMembers = asyncHandler(async (req, res) => {
  const cluster = await Cluster.findById(req.params.id);
  if (!cluster) return res.status(404).json({ success: false, error: 'Cluster not found' });
  const members = await Cluster.getMembers(req.params.id);
  res.json({ success: true, cluster: cluster.name, data: members });
});

// PUT /api/clusters/:id/update-location
export const updateMemberLocation = asyncHandler(async (req, res) => {
  const { fisherman_id, userId, lat, lng } = req.body;
  const fid = fisherman_id ?? userId;
  if (!fid || lat == null || lng == null)
    return res.status(400).json({ success: false, error: 'fisherman_id, lat, lng required' });
  await Cluster.updateMemberLocation(parseInt(fid), req.params.id, lat, lng);
  res.json({ success: true });
});

// GET /api/clusters/my-clusters?userId=123  or  ?fishermanId=123
export const getMyClusters = asyncHandler(async (req, res) => {
  const id = req.query.userId ?? req.query.fishermanId;
  if (!id) return res.status(400).json({ success: false, error: 'userId or fishermanId required' });
  const clusters = await Cluster.getMemberClusters(parseInt(id));
  res.json({ success: true, data: clusters });
});

// ─────────────────────────────────────────────────────────────────────────────
// E) POST /api/clusters/:id/alert  — send alert to cluster (admin only)
// Body: { message, type }
// Returns: { alert, affectedFishermen }
// ─────────────────────────────────────────────────────────────────────────────
export const sendAlertToCluster = asyncHandler(async (req, res) => {
  const { message, type, lat, lng } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'message is required' });

  const cluster = await Cluster.findById(req.params.id);
  if (!cluster) return res.status(404).json({ success: false, error: 'Cluster not found' });

  const { alert, affectedFishermen } = await Cluster.sendAlert(
    req.params.id,
    message,
    type ?? 'INFO',
    req.user?.id ?? null,
    lat ?? null,
    lng ?? null
  );

  res.status(201).json({
    success: true,
    message: `Alert sent to cluster "${cluster.name}". ${affectedFishermen.length} fisherman(s) affected.`,
    data: {
      alert,
      affectedFishermen,
      totalAffected: affectedFishermen.length,
    },
  });
});

// Alias: POST /api/clusters/:id/broadcast  (used by border auto-alert)
export const broadcastToCluster = asyncHandler(async (req, res) => {
  const { message, type, sentBy, lat, lng } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'message is required' });
  const cluster = await Cluster.findById(req.params.id);
  if (!cluster) return res.status(404).json({ success: false, error: 'Cluster not found' });
  const { alert, affectedFishermen } = await Cluster.sendAlert(
    req.params.id, message, type ?? 'INFO',
    sentBy ?? req.user?.id ?? null, lat ?? null, lng ?? null
  );
  res.status(201).json({ success: true, data: { alert, affectedFishermen } });
});

// GET /api/clusters/:id/notifications
export const getClusterNotifications = asyncHandler(async (req, res) => {
  const notifications = await Cluster.getNotifications(
    req.params.id, parseInt(req.query.limit ?? 30)
  );
  res.json({ success: true, data: notifications });
});

// ─────────────────────────────────────────────────────────────────────────────
// Smart GPS auto-assign
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/clusters/auto-join
export const autoJoinCluster = asyncHandler(async (req, res) => {
  const { userId, fisherman_id, lat, lng, radiusKm } = req.body;
  const fid = fisherman_id ?? userId;
  if (!fid || lat == null || lng == null)
    return res.status(400).json({ success: false, error: 'fisherman_id (or userId), lat, lng required' });
  const result = await Cluster.autoJoin(
    parseInt(fid), parseFloat(lat), parseFloat(lng), radiusKm ?? 50
  );
  res.json({ success: true, data: result });
});

// GET /api/clusters/nearby?lat=&lng=&radius=
export const getNearbyClusters = asyncHandler(async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, error: 'lat, lng required' });
  const clusters = await Cluster.findNearby(
    parseFloat(lat), parseFloat(lng), parseFloat(radius ?? 50)
  );
  res.json({ success: true, data: clusters });
});

