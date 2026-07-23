const mysql = require('mysql2/promise');

async function removeDuplicate() {
  const c = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});
  try {
    const [result] = await c.query('DELETE FROM companies WHERE guid = "4d9d55ad-f3a4-4993-869e-b063e28ce954"');
    console.log('Deleted empty duplicate company. Rows affected:', result.affectedRows);
  } catch(e) {
    console.error(e);
  } finally {
    c.end();
  }
}
removeDuplicate();
