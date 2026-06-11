const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const db = require('./db');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spital';

// Helper to get administrative connection string (postgres DB)
function getAdminUrl(url) {
  const parts = url.split('/');
  parts[parts.length - 1] = 'postgres';
  return parts.join('/');
}

async function ensureDatabaseExists() {
  const adminUrl = getAdminUrl(connectionString);
  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'spital'");
    if (res.rowCount === 0) {
      console.log('Database "spital" does not exist. Creating database...');
      await client.query('CREATE DATABASE spital');
      console.log('Database "spital" created successfully.');
    } else {
      console.log('Database "spital" already exists.');
    }
  } catch (error) {
    console.error('Error checking/creating database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function seed() {
  try {
    // 1. Ensure the DB itself exists first
    await ensureDatabaseExists();

    // 2. Run schema.sql
    console.log('Initializing database tables...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schemaSql);
    console.log('Tables created or verified.');

    // 3. Run seed.sql
    console.log('Running SQL seed scripts...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await db.query(seedSql);
    console.log('Database successfully seeded with SQL values!');

    console.log('Seeding process completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.pool.end();
  }
}

seed();
