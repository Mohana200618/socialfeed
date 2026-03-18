import { pool } from '../config/database.js';
import { haversineDistance } from '../utils/distance.js';

class Cluster {
  // ── Basic CRUD ─────────────────────────────────────────────────────────────
  static async findAll() {
    const result = await pool.query(
      `SELECT c.*, u.username AS coordinator_name,
              COUNT(DISTINCT fc.fisherman_id) AS member_count
       FROM clusters c
       LEFT JOIN users u ON c.coordinator_id = u.id
       LEFT JOIN fisherman_clusters fc ON fc.cluster_id = c.id
       GROUP BY c.id, u.username
       ORDER BY c.created_at DESC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT c.*, u.username AS coordinator_name,
              COUNT(DISTINCT fc.fisherman_id) AS member_count
       FROM clusters c
       LEFT JOIN users u ON c.coordinator_id = u.id
       LEFT JOIN fisherman_clusters fc ON fc.cluster_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, u.username`,
      [id]
    );
    return result.rows[0];
  }

  static async create({ name, description, location, latitude, longitude, radius_km, coordinatorId }) {
    const result = await pool.query(
      `INSERT INTO clusters (name, description, location, latitude, longitude, radius_km, coordinator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description ?? null, location ?? null, latitude ?? null, longitude ?? null, radius_km ?? 50, coordinatorId ?? null]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let p = 1;
    if (data.name !== undefined)        { fields.push(`name = $${p++}`);          values.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${p++}`);   values.push(data.description); }
    if (data.location !== undefined)    { fields.push(`location = $${p++}`);      values.push(data.location); }
    if (data.latitude !== undefined)    { fields.push(`latitude = $${p++}`);      values.push(data.latitude); }
    if (data.longitude !== undefined)   { fields.push(`longitude = $${p++}`);     values.push(data.longitude); }
    if (data.radius_km !== undefined)   { fields.push(`radius_km = $${p++}`);     values.push(data.radius_km); }
    if (data.coordinatorId !== undefined){ fields.push(`coordinator_id = $${p++}`);values.push(data.coordinatorId); }
    if (fields.length === 0) return null;
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const result = await pool.query(
      `UPDATE clusters SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query('DELETE FROM clusters WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  }

  // ── Membership (fisherman_clusters) ───────────────────────────────────────

  /**
   * Add / update a fisherman's membership in a cluster.
   * Uses ON CONFLICT to upsert so calling it multiple times is safe.
   */
  static async joinCluster(fishermanId, clusterId, lat, lng) {
    const result = await pool.query(
      `INSERT INTO fisherman_clusters (fisherman_id, cluster_id, latitude, longitude, last_seen)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (cluster_id, fisherman_id)
       DO UPDATE SET latitude = $3, longitude = $4, last_seen = CURRENT_TIMESTAMP
       RETURNING *`,
      [fishermanId, clusterId, lat ?? null, lng ?? null]
    );
    return result.rows[0];
  }

  static async leaveCluster(fishermanId, clusterId) {
    const result = await pool.query(
      'DELETE FROM fisherman_clusters WHERE fisherman_id = $1 AND cluster_id = $2 RETURNING id',
      [fishermanId, clusterId]
    );
    return result.rows[0];
  }

  /** All fishermen in a cluster with their profile + last known GPS */
  static async getMembers(clusterId) {
    const result = await pool.query(
      `SELECT fc.*, u.username, u.full_name, u.phone_number
       FROM fisherman_clusters fc
       JOIN users u ON u.id = fc.fisherman_id
       WHERE fc.cluster_id = $1
       ORDER BY fc.last_seen DESC`,
      [clusterId]
    );
    return result.rows;
  }

  static async updateMemberLocation(fishermanId, clusterId, lat, lng) {
    await pool.query(
      `UPDATE fisherman_clusters
       SET latitude = $3, longitude = $4, last_seen = CURRENT_TIMESTAMP
       WHERE fisherman_id = $1 AND cluster_id = $2`,
      [fishermanId, clusterId, lat, lng]
    );
  }

  /** All clusters a fisherman belongs to */
  static async getMemberClusters(fishermanId) {
    const result = await pool.query(
      `SELECT c.*, fc.joined_at, fc.last_seen,
              fc.latitude AS member_lat, fc.longitude AS member_lng
       FROM fisherman_clusters fc
       JOIN clusters c ON c.id = fc.cluster_id
       WHERE fc.fisherman_id = $1
       ORDER BY fc.last_seen DESC`,
      [fishermanId]
    );
    return result.rows;
  }

  // ── Alerts (cluster_alerts) ────────────────────────────────────────────────

  /**
   * Store an alert for a cluster and return the affected fishermen list.
   */
  static async sendAlert(clusterId, message, type, sentBy, lat, lng) {
    // Persist the alert
    const alertResult = await pool.query(
      `INSERT INTO cluster_alerts (cluster_id, sent_by, message, type, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [clusterId, sentBy ?? null, message, type ?? 'INFO', lat ?? null, lng ?? null]
    );
    const alert = alertResult.rows[0];

    // Fetch affected fishermen
    const members = await Cluster.getMembers(clusterId);

    return { alert, affectedFishermen: members };
  }

  /** Alias kept for border-route auto-broadcast compatibility */
  static async broadcastNotification(clusterId, message, type, sentBy, lat, lng) {
    return Cluster.sendAlert(clusterId, message, type, sentBy, lat, lng);
  }

  static async getNotifications(clusterId, limit = 30) {
    const result = await pool.query(
      `SELECT ca.*, u.username AS sender_name
       FROM cluster_alerts ca
       LEFT JOIN users u ON u.id = ca.sent_by
       WHERE ca.cluster_id = $1
       ORDER BY ca.created_at DESC
       LIMIT $2`,
      [clusterId, limit]
    );
    return result.rows;
  }

  // ── Geo helpers ────────────────────────────────────────────────────────────

  /** Find clusters whose centre is within radiusKm of (lat, lng) */
  static async findNearby(lat, lng, radiusKm = 50) {
    const deg = radiusKm / 111;
    const result = await pool.query(
      `SELECT * FROM clusters
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
         AND latitude  BETWEEN $1 AND $2
         AND longitude BETWEEN $3 AND $4`,
      [lat - deg, lat + deg, lng - deg, lng + deg]
    );
    return result.rows
      .map(c => ({
        ...c,
        distanceKm: haversineDistance(lat, lng, parseFloat(c.latitude), parseFloat(c.longitude)),
      }))
      .filter(c => c.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Automatically assign a fisherman to the nearest cluster within radiusKm.
   * If none exists, create a new one centred at the fisherman's position.
   * Returns { cluster, created, member }
   */
  static async autoJoin(fishermanId, lat, lng, radiusKm = 50) {
    const nearby = await Cluster.findNearby(lat, lng, radiusKm);
    let cluster;
    let created = false;

    if (nearby.length > 0) {
      cluster = nearby[0];
    } else {
      cluster = await Cluster.create({
        name: `Sea Cluster ${new Date().toISOString().slice(0, 10)}`,
        description: 'Auto-created cluster for nearby fishermen.',
        location: `${lat.toFixed(3)}°N ${lng.toFixed(3)}°E`,
        latitude: lat,
        longitude: lng,
        radius_km: radiusKm,
        coordinatorId: fishermanId,
      });
      created = true;
    }

    const member = await Cluster.joinCluster(fishermanId, cluster.id, lat, lng);
    return { cluster, created, member };
  }
}

export default Cluster;
