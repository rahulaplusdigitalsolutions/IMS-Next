const mysql = require('mysql2/promise');

async function check() {
  const c = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});
  try {
    const [x] = await c.query('SELECT guid FROM companies WHERE name="Aplus"');
    const guid = x[0].guid;
    const [orders] = await c.query('SELECT COUNT(*) as c FROM orders WHERE companyGuid=?', [guid]);
    const [items] = await c.query('SELECT COUNT(*) as c FROM order_items WHERE companyGuid=?', [guid]);
    const [logistics] = await c.query('SELECT COUNT(*) as c FROM order_logistics WHERE companyGuid=?', [guid]);
    const [installs] = await c.query('SELECT COUNT(*) as c FROM order_installations WHERE companyGuid=?', [guid]);
    
    console.log({
      guid, 
      orders: orders[0].c, 
      items: items[0].c, 
      logistics: logistics[0].c,
      installs: installs[0].c
    });
  } catch(e) {
    console.error(e);
  } finally {
    c.end();
  }
}

check();
