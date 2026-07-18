const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ims',
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, 'multi_tenant_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Running migration...");
    await pool.query(sql);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

run();
