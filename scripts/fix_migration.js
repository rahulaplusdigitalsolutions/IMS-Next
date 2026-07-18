const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function run() {
  const p = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ims'
  });
  
  try {
    const [defaultCompany] = await p.query("SELECT guid FROM companies WHERE name='Default Company' LIMIT 1");
    if (defaultCompany.length === 0) {
      console.log('Default Company not found!');
      return;
    }
    const defaultGuid = defaultCompany[0].guid;

    const tables = [
      'inventoryvendor',
      'inventorycategorymaster',
      'replacementhistory',
      'useractivitylogs',
      'wc_certs',
      'warranty_template',
      'inventoryitemmaster',
      'inventoryitemvariant',
      'inventorystockout',
      'inventorystockoutdetail',
      'inventorybrandmaster',
      'fbf_fba_stock',
      'fbf_fba_transactions',
      'inventorystationeryreturns'
    ];
    
    for (let t of tables) {
      try {
        console.log(`Fixing ${t}...`);
        await p.query(`ALTER TABLE ${t} ADD COLUMN companyGuid CHAR(36) NULL`);
        await p.query(`UPDATE ${t} SET companyGuid = ?`, [defaultGuid]);
        await p.query(`ALTER TABLE ${t} MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid)`);
        console.log(`${t} OK`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`${t} ALREADY HAS companyGuid`);
        } else {
          console.log(`${t} ERROR`, e.message);
        }
      }
    }
  } finally {
    p.end();
  }
}

run();
