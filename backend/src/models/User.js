import { pool } from '../config/database.js';

class User {
  static async findAll() {
    const result = await pool.query(
      'SELECT id, username, phone_number, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, username, phone_number, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async findByPhone(phoneNumber) {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    return result.rows[0];
  }

  static async findByUsernameOrPhone(identifier) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR phone_number = $1',
      [identifier]
    );
    return result.rows[0];
  }

  static async create(userData) {
    const { username, phoneNumber, password, role } = userData;
    const result = await pool.query(
      'INSERT INTO users (username, phone_number, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, phone_number, role, is_active, created_at, updated_at',
      [username, phoneNumber, password, role]
    );
    return result.rows[0];
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (userData.username) {
      fields.push(`username = $${paramCount++}`);
      values.push(userData.username);
    }
    if (userData.phoneNumber) {
      fields.push(`phone_number = $${paramCount++}`);
      values.push(userData.phoneNumber);
    }
    if (userData.password) {
      fields.push(`password = $${paramCount++}`);
      values.push(userData.password);
    }
    if (userData.role) {
      fields.push(`role = $${paramCount++}`);
      values.push(userData.role);
    }
    if (userData.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(userData.is_active);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, phone_number, role, is_active, created_at, updated_at`;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }
}

export default User;
