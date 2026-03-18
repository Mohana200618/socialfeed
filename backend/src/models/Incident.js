import { pool } from '../config/database.js';

class Incident {
  static _mediaSchemaReady = false;

  static async ensureMediaSchema() {
    if (this._mediaSchemaReady) return;

    await pool.query(
      `ALTER TABLE incidents
       ADD COLUMN IF NOT EXISTS media_attachments JSONB DEFAULT '[]'::jsonb`
    );

    this._mediaSchemaReady = true;
  }

  static async findAll(filters = {}) {
    await this.ensureMediaSchema();

    let query = `SELECT i.*, COALESCE(i.media_attachments, '[]'::jsonb) AS media_attachments,
                 u.username as reporter_name
                 FROM incidents i
                 LEFT JOIN users u ON i.reported_by = u.id`;
    const values = [];
    let paramCount = 1;
    const conditions = [];

    if (filters.status) {
      conditions.push(`i.status = $${paramCount++}`);
      values.push(filters.status);
    }

    if (filters.reportedBy) {
      conditions.push(`i.reported_by = $${paramCount++}`);
      values.push(filters.reportedBy);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    await this.ensureMediaSchema();

    const result = await pool.query(
      `SELECT i.*, COALESCE(i.media_attachments, '[]'::jsonb) AS media_attachments,
       u.username as reporter_name
       FROM incidents i
       LEFT JOIN users u ON i.reported_by = u.id
       WHERE i.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(incidentData) {
    await this.ensureMediaSchema();

    const {
      title,
      description,
      incidentType,
      location,
      latitude,
      longitude,
      reportedBy,
      mediaAttachments,
    } = incidentData;

    const serializedMediaAttachments = JSON.stringify(
      Array.isArray(mediaAttachments) ? mediaAttachments : []
    );

    const result = await pool.query(
      `INSERT INTO incidents (title, description, incident_type, location, latitude, longitude, reported_by, media_attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING *`,
      [
        title,
        description,
        incidentType,
        location,
        latitude,
        longitude,
        reportedBy,
        serializedMediaAttachments,
      ]
    );
    return result.rows[0];
  }

  static async update(id, incidentData) {
    await this.ensureMediaSchema();

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (incidentData.title) {
      fields.push(`title = $${paramCount++}`);
      values.push(incidentData.title);
    }
    if (incidentData.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(incidentData.description);
    }
    if (incidentData.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(incidentData.status);
    }
    if (incidentData.mediaAttachments !== undefined) {
      fields.push(`media_attachments = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(incidentData.mediaAttachments));
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE incidents SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async addMediaAttachments(id, mediaAttachments) {
    await this.ensureMediaSchema();

    const result = await pool.query(
      `UPDATE incidents
       SET media_attachments = COALESCE(media_attachments, '[]'::jsonb) || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(mediaAttachments), id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM incidents WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }
}

export default Incident;
