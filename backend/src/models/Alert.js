import { pool } from '../config/database.js';

class Alert {
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM alerts WHERE is_active = true';
    const values = [];
    let paramCount = 1;

    if (filters.severity) {
      query += ` AND severity = $${paramCount++}`;
      values.push(filters.severity);
    }

    if (filters.alertType) {
      query += ` AND alert_type = $${paramCount++}`;
      values.push(filters.alertType);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM alerts WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(alertData) {
    const { title, description, alertType, severity, location, latitude, longitude, createdBy } = alertData;
    const result = await pool.query(
      `INSERT INTO alerts (title, description, alert_type, severity, location, latitude, longitude, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, description, alertType, severity, location, latitude, longitude, createdBy]
    );
    return result.rows[0];
  }

  static async update(id, alertData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (alertData.title) {
      fields.push(`title = $${paramCount++}`);
      values.push(alertData.title);
    }
    if (alertData.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(alertData.description);
    }
    if (alertData.severity) {
      fields.push(`severity = $${paramCount++}`);
      values.push(alertData.severity);
    }
    if (alertData.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(alertData.isActive);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE alerts SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM alerts WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  static async getTopAlertsBySeverity(limit = 3) {
    const result = await pool.query(
      `SELECT * FROM alerts 
       WHERE is_active = true 
       ORDER BY 
         CASE severity 
           WHEN 'red' THEN 1 
           WHEN 'yellow' THEN 2 
           WHEN 'green' THEN 3 
         END,
         created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

export default Alert;
