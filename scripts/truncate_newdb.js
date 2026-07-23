const mysql = require('mysql2/promise');

async function truncateNewDb() {
  const c = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});
  try {
    await c.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await c.query('SHOW TABLES');
    
    for (let t of tables) {
      const table = Object.values(t)[0];
      await c.query(`TRUNCATE TABLE \`${table}\``);
      console.log(`Truncated ${table}`);
    }
    
    await c.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All newdb tables truncated successfully!');
  } catch(e) {
    console.error('Fatal error:', e);
  } finally {
    c.end();
  }
}

truncateNewDb();
