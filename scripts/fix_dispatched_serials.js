const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});
  try {
    await c.query('UPDATE inventorystockinserial SET guid = serialId WHERE guid IS NULL');
    console.log('Fixed guid');
    await c.query("UPDATE inventorystockinserial SET isUsed=1, isSold=1, serialStatus='Dispatched' WHERE serialId IN (SELECT guid FROM serials WHERE status='Dispatched')");
    console.log('Fixed isUsed for dispatched serials');
  } catch (e) {
    console.error(e);
  } finally {
    c.end();
  }
}
run();
