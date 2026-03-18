-- Create database if it doesn't exist
-- Note: Run this manually if needed: CREATE DATABASE blue;

-- Connect to the database
\c blue

-- Drop existing tables (CASCADE to handle foreign key dependencies)
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS weather_data CASCADE;
DROP TABLE IF EXISTS fishing_zones CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;
DROP TABLE IF EXISTS social_feed CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('fisherman', 'volunteer', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- Create alerts table
CREATE TABLE alerts (
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
);

CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_active ON alerts(is_active);

-- Create incidents table
CREATE TABLE incidents (
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
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_reporter ON incidents(reported_by);

-- Create social feed table
CREATE TABLE social_feed (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_social_feed_user ON social_feed(user_id);
CREATE INDEX idx_social_feed_created ON social_feed(created_at DESC);

-- Create clusters table
CREATE TABLE clusters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  coordinator_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fishing zones table
CREATE TABLE fishing_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  zone_type VARCHAR(50),
  coordinates TEXT, -- JSON array of coordinates
  is_restricted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create weather data table
CREATE TABLE weather_data (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255) NOT NULL,
  temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  wind_speed DECIMAL(5, 2),
  wind_direction VARCHAR(10),
  pressure DECIMAL(7, 2),
  weather_condition VARCHAR(100),
  forecast_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weather_location ON weather_data(location);
CREATE INDEX idx_weather_date ON weather_data(forecast_date);

-- Create user settings table
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  language VARCHAR(10) DEFAULT 'en',
  volume INTEGER DEFAULT 50 CHECK (volume >= 0 AND volume <= 100),
  brightness INTEGER DEFAULT 50 CHECK (brightness >= 0 AND brightness <= 100),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
-- Password: password123 (hashed with bcrypt)
INSERT INTO users (username, phone_number, password, role) 
VALUES 
  ('admin', '1234567890', '$2a$10$YourHashedPasswordHere', 'admin'),
  ('fisherman1', '9876543210', '$2a$10$YourHashedPasswordHere', 'fisherman'),
  ('volunteer1', '5555555555', '$2a$10$YourHashedPasswordHere', 'volunteer')
ON CONFLICT (username) DO NOTHING;
