const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 10000,
  query_timeout: 10000
});

pool.connect()
  .then(() => console.log("✅ Connected to Supabase (IPv4 forced)"))
  .catch(err => console.error("❌ Database connection error:", err));

module.exports = pool;
