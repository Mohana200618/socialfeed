import { pool } from '../config/database.js';

class UserSettings {
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async create(userId, settings = {}) {
    const { language = 'en', volume = 50, brightness = 50, notificationsEnabled = true } = settings;
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, language, volume, brightness, notifications_enabled) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, language, volume, brightness, notificationsEnabled]
    );
    return result.rows[0];
  }

  static async update(userId, settings) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (settings.language) {
      fields.push(`language = $${paramCount++}`);
      values.push(settings.language);
    }
    if (settings.volume !== undefined) {
      fields.push(`volume = $${paramCount++}`);
      values.push(settings.volume);
    }
    if (settings.brightness !== undefined) {
      fields.push(`brightness = $${paramCount++}`);
      values.push(settings.brightness);
    }
    if (settings.notificationsEnabled !== undefined) {
      fields.push(`notifications_enabled = $${paramCount++}`);
      values.push(settings.notificationsEnabled);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getOrCreate(userId) {
    let settings = await this.findByUserId(userId);
    if (!settings) {
      settings = await this.create(userId);
    }
    return settings;
  }
}

export default UserSettings;
