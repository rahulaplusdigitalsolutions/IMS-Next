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
    const tables = ['models', 'serials', 'godowns', 'orders', 'order_items', 'order_logistics', 'order_installations', 'orderdocuments', 'payments', 'returns', 'serialmovements', 'stocktransferhistory', 'notifications', 'bulkorders', 'bulkorderitems', 'bulkorderinvoices', 'bulkorderdispatches', 'bulkorderpayments', 'replacementhistory', 'useractivitylogs', 'wc_certs', 'warranty_template', 'inventoryitemmaster', 'inventoryitemvariant', 'inventorystockout', 'inventorystockoutdetail', 'inventorybrandmaster', 'fbf_fba_stock', 'fbf_fba_transactions'];
    for (let t of tables) {
      try {
        const [r] = await p.query(`SHOW COLUMNS FROM ${t} LIKE 'companyGuid'`);
        if (r.length === 0) {
          console.log(t, 'MISSING');
        } else {
          console.log(t, 'OK');
        }
      } catch (e) {
        console.log(t, 'ERROR', e.message);
      }
    }
  } finally {
    p.end();
  }
}

run();
