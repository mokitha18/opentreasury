const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ Connected to Supabase"))
  .catch(err => console.error("❌ Database connection error:", err));

module.exports = pool;
