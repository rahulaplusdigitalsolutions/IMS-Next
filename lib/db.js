import mysql from "mysql2/promise";

// Cached on globalThis so the pool survives Next.js dev hot-reload / Turbopack
// module re-evaluation (a plain module-level singleton gets re-created on every
// edit in dev, which would exhaust MySQL's max_connections quickly).
const globalForPool = globalThis;

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "UTF8MB4_UNICODE_CI",
    waitForConnections: true,
    connectionLimit: 25,
    connectTimeout: 10000,
    queueLimit: 0,
  });
}

export const mysqlPool = globalForPool.__imsMysqlPool || createPool();
if (!globalForPool.__imsMysqlPool) globalForPool.__imsMysqlPool = mysqlPool;

// Kept for compatibility with the Backend4 call pattern (getMysqlPool()) used
// throughout the ported route handlers.
export async function getMysqlPool() {
  return mysqlPool;
}
