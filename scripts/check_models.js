const mysql = require('mysql2/promise');

async function test() {
  const c = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});
  try {
    const [itv] = await c.query('SELECT * FROM inventoryitemvariant WHERE itemVariantId="689c6e4e-696b-11f1-b5e8-fe31f84882b3"');
    const [mdl] = await c.query('SELECT * FROM models WHERE guid="689c6e4e-696b-11f1-b5e8-fe31f84882b3"');
    console.log('In itv:', itv.length, 'In models:', mdl.length);
  } catch(e) {
    console.error(e);
  } finally {
    c.end();
  }
}
test();
