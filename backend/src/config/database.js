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
  console.log('Database tables are managed by database.sql');

  try {
    // Add radius_km to clusters if it doesn't exist yet
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
