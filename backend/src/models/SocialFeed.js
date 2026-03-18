import { pool } from '../config/database.js';

class SocialFeed {
  static async findAll(limit = 50) {
    const result = await pool.query(
      `SELECT sf.*, u.username, u.role 
       FROM social_feed sf 
       LEFT JOIN users u ON sf.user_id = u.id 
       ORDER BY sf.created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT sf.*, u.username, u.role 
       FROM social_feed sf 
       LEFT JOIN users u ON sf.user_id = u.id 
       WHERE sf.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT sf.*, u.username, u.role 
       FROM social_feed sf 
       LEFT JOIN users u ON sf.user_id = u.id 
       WHERE sf.user_id = $1 
       ORDER BY sf.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async create(postData) {
    const {
      userId, content, imageUrl,
      title, hazardType, priority, location, community, source, sourceUrl
    } = postData;
    const result = await pool.query(
      `INSERT INTO social_feed
         (user_id, content, image_url, title, hazard_type, priority, location, community, source, source_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId, content, imageUrl || null,
        title || null,
        hazardType || 'unspecified',
        priority || 'normal',
        location || null,
        community || null,
        source || 'community_report',
        sourceUrl || null
      ]
    );
    return result.rows[0];
  }

  static async update(id, postData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (postData.content !== undefined) {
      fields.push(`content = $${paramCount++}`);
      values.push(postData.content);
    }
    if (postData.likesCount !== undefined) {
      fields.push(`likes_count = $${paramCount++}`);
      values.push(postData.likesCount);
    }
    if (postData.commentsCount !== undefined) {
      fields.push(`comments_count = $${paramCount++}`);
      values.push(postData.commentsCount);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE social_feed SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM social_feed WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  static async updateNlpResult(id, confidence, label) {
    const result = await pool.query(
      `UPDATE social_feed SET nlp_confidence = $1, nlp_label = $2 WHERE id = $3 RETURNING *`,
      [confidence, label, id]
    );
    return result.rows[0];
  }

  static async markAlertSent(id) {
    const result = await pool.query(
      `UPDATE social_feed SET nlp_alert_sent = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async dismiss(id) {
    const result = await pool.query(
      `UPDATE social_feed SET nlp_dismissed = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  // Posts with confidence >= 80 not yet acted on
  static async findPendingAlerts() {
    const result = await pool.query(
      `SELECT sf.*, u.username, u.role
       FROM social_feed sf
       LEFT JOIN users u ON sf.user_id = u.id
       WHERE sf.nlp_confidence >= 80
         AND sf.nlp_alert_sent = FALSE
         AND sf.nlp_dismissed = FALSE
       ORDER BY sf.nlp_confidence DESC, sf.created_at DESC`
    );
    return result.rows;
  }

  // All posts with NLP scores for review
  static async findAllWithNlp(limit = 50) {
    const result = await pool.query(
      `SELECT sf.*, u.username, u.role
       FROM social_feed sf
       LEFT JOIN users u ON sf.user_id = u.id
       ORDER BY sf.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Check if an article with the given source URL already exists (deduplication)
  static async findBySourceUrl(url) {
    if (!url) return null;
    const result = await pool.query(
      `SELECT id FROM social_feed WHERE source_url = $1 LIMIT 1`,
      [url]
    );
    return result.rows[0] || null;
  }
}

export default SocialFeed;
