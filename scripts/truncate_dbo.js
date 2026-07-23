const mysql = require('mysql2/promise');

async function truncateDbo() {
  const c = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'dbo'});
  try {
    await c.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await c.query('SHOW TABLES');
    for (let t of tables) {
      const tName = Object.values(t)[0];
      await c.query(`TRUNCATE TABLE \`${tName}\``);
      console.log('Truncated', tName);
    }
    await c.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All dbo tables truncated');
  } catch(e) {
    console.error(e);
  } finally {
    c.end();
  }
}

truncateDbo();
