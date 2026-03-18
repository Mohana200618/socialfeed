import pkg from 'pg';
const { Pool } = pkg;

let pool;

const connectDB = async () => {
  try {
    const connectionString = process.env.DATABASE_URL ||
      `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'blue'}`;

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await pool.connect();
    console.log(`PostgreSQL Connected: ${client.host}`);
    client.release();

    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    console.warn('⚠️  Running without database — DB-dependent routes will fail. Border alert route is unaffected.');
    // Do NOT exit; allows stateless routes (e.g. /api/border) to keep serving.
  }
};

const createTables = async () => {
  console.log('Creating/verifying database tables...');

  // Core tables (CREATE IF NOT EXISTS — safe to run on fresh DB)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('fisherman', 'volunteer', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('border', 'warning', 'tidal', 'weather')),
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('red', 'yellow', 'green')),
        location VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        incident_type VARCHAR(50),
        location VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        media_attachments JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'closed')),
        reported_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_feed (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        image_url VARCHAR(500),
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_feed_user ON social_feed(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_feed_created ON social_feed(created_at DESC)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clusters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        radius_km FLOAT DEFAULT 50,
        coordinator_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fishing_zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        zone_type VARCHAR(50),
        coordinates TEXT,
        is_restricted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        language VARCHAR(10) DEFAULT 'en',
        volume INTEGER DEFAULT 50 CHECK (volume >= 0 AND volume <= 100),
        brightness INTEGER DEFAULT 50 CHECK (brightness >= 0 AND brightness <= 100),
        notifications_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅  Core tables ready.');
  } catch (err) {
    console.warn('Core table creation error:', err.message);
  }

  try {
    // Add radius_km to clusters if it doesn't exist yet (for existing DBs)
    await pool.query(`
      ALTER TABLE clusters ADD COLUMN IF NOT EXISTS radius_km FLOAT DEFAULT 50
    `);

    // fisherman_clusters — who belongs to which cluster (+ live GPS)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fisherman_clusters (
        id SERIAL PRIMARY KEY,
        fisherman_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cluster_id INTEGER REFERENCES clusters(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cluster_id, fisherman_id)
      )
    `);

    // cluster_alerts — alerts broadcast to a cluster
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cluster_alerts (
        id SERIAL PRIMARY KEY,
        cluster_id INTEGER REFERENCES clusters(id) ON DELETE CASCADE,
        sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'INFO',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅  Cluster tables ready (fisherman_clusters, cluster_alerts).');
  } catch (err) {
    console.warn('Could not create cluster tables:', err.message);
  }

  // NLP confidence columns on social_feed
  try {
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS nlp_confidence INTEGER DEFAULT NULL`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS nlp_label VARCHAR(20) DEFAULT NULL`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS nlp_alert_sent BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS nlp_dismissed BOOLEAN DEFAULT FALSE`);
    console.log('✅  NLP columns ready on social_feed.');
  } catch (err) {
    console.warn('Could not add NLP columns:', err.message);
  }

  // Social feed extended fields (HARINI-DS integration)
  try {
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT NULL`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS hazard_type VARCHAR(50) DEFAULT 'unspecified'`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS community VARCHAR(255) DEFAULT NULL`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'community_report'`);
    await pool.query(`ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT NULL`);
    console.log('✅  Extended social_feed columns ready (title, hazard_type, priority, location, source).');
  } catch (err) {
    console.warn('Could not add extended social_feed columns:', err.message);
  }
};

export { pool };
export default connectDB;
