import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ path: "D:/IMS-next/.env.local" });
const conn = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT)||3306,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
const tables = ["inventoryitemvariant","inventoryitemmaster","inventorybrandmaster","inventorycategorymaster",
"inventoryvendor","inventorystationeryreturns","inventorystockout","inventorystockoutdetail",
"replacementhistory","useractivitylogs","wc_certs","warranty_template","fbf_fba_stock","fbf_fba_transactions"];
for (const t of tables) {
  const [ex] = await conn.query("SHOW TABLES LIKE ?", [t]);
  if (ex.length === 0) { console.log(t, "-> TABLE DOES NOT EXIST"); continue; }
  const [cols] = await conn.query(`SHOW COLUMNS FROM \`${t}\` LIKE 'companyGuid'`);
  const [total] = await conn.query(`SELECT COUNT(*) as c FROM \`${t}\``);
  console.log(t, "-> exists, hasCompanyGuid:", cols.length>0, "rows:", total[0].c);
}
await conn.end();
