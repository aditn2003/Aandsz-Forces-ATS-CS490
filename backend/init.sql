
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  provider VARCHAR(50) DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  location VARCHAR(255),
  title VARCHAR(255),
  bio TEXT,
  industry VARCHAR(100),
  experience VARCHAR(50),
  picture_url TEXT
);

CREATE TABLE IF NOT EXISTS employment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  company VARCHAR(255),
  location VARCHAR(255),
  start_date DATE,
  end_date DATE,
  description TEXT,
  current BOOLEAN DEFAULT FALSE
);
