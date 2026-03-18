import { pool } from '../config/database.js';

class FishingZone {
  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM fishing_zones ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM fishing_zones WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(zoneData) {
    const { name, description, zoneType, coordinates, isRestricted } = zoneData;
    const result = await pool.query(
      `INSERT INTO fishing_zones (name, description, zone_type, coordinates, is_restricted) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, description, zoneType, coordinates, isRestricted]
    );
    return result.rows[0];
  }

  static async update(id, zoneData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (zoneData.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(zoneData.name);
    }
    if (zoneData.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(zoneData.description);
    }
    if (zoneData.isRestricted !== undefined) {
      fields.push(`is_restricted = $${paramCount++}`);
      values.push(zoneData.isRestricted);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE fishing_zones SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM fishing_zones WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }
}

export default FishingZone;
