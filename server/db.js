const { Pool } = require('pg');
require('dotenv').config();

// Default connection string targets localhost spital database
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spital';

const pool = new Pool({
  connectionString,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
