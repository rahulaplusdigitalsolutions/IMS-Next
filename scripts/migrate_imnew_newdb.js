const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function run() {
  const source = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'imnew'});
  const dest = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});

  try {
    console.log('Starting full data migration from imnew to newdb...');

    await dest.query('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Create Aplus company
    const companyGuid = uuidv4();
    await dest.query(`
      INSERT INTO newdb.companies (guid, name, isActive) 
      VALUES (?, 'Aplus', 1)
    `, [companyGuid]);
    console.log(`Created Aplus company: ${companyGuid}`);

    // 4. Function to dynamically copy table data
    async function copyTable(table, requireCompany = false) {
      try {
        await dest.query(`CREATE TABLE IF NOT EXISTS newdb.\`${table}\` LIKE imnew.\`${table}\``);
        
        const [dCols] = await source.query('DESCRIBE `' + table + '`');
        const [nCols] = await dest.query('DESCRIBE `' + table + '`');
        
        const dNames = dCols.map(c=>c.Field);
        const nNames = nCols.map(c=>c.Field);
        
        const common = dNames.filter(n=>nNames.includes(n));
        if (common.length === 0) return;

        let insCols = [...common];
        let selCols = [...common.map(n=>`\`${n}\``)];
        
        if (nNames.includes('companyGuid') && !dNames.includes('companyGuid')) {
          insCols.push('companyGuid');
          selCols.push(`'${companyGuid}'`);
        } else if (nNames.includes('companyGuid') && requireCompany) {
          // If it already has it, override it to ensure it goes to Aplus
          const idx = insCols.indexOf('companyGuid');
          if (idx !== -1) {
              selCols[idx] = `'${companyGuid}'`;
          } else {
              insCols.push('companyGuid');
              selCols.push(`'${companyGuid}'`);
          }
        }
        
        // Disable foreign keys for the insert
        const q = `INSERT IGNORE INTO newdb.\`${table}\` (\`${insCols.join('`, `')}\`) SELECT ${selCols.join(', ')} FROM imnew.\`${table}\``;
        await dest.query(q);
        console.log(`Copied ${table}`);
      } catch (err) {
        console.log(`Skipping table ${table}: ${err.message}`);
      }
    }

    // 5. Migrate all tables from imnew
    const [tables] = await source.query('SHOW TABLES');
    for (const t of tables) {
      const tName = Object.values(t)[0];
      await copyTable(tName, true);
    }

    // Link users to company
    const [users] = await source.query('SELECT * FROM users');
    for (const u of users) {
        await dest.query(`INSERT IGNORE INTO newdb.user_companies (userGuid, companyGuid, isDefault) VALUES (?, ?, 1)`, [u.userid, companyGuid]);
    }
    console.log('Linked users to Aplus');

    // 6. Schema Fixes (Same as we did manually before)
    try {
      await dest.query('UPDATE newdb.inventorystockinserial SET guid = serialId WHERE guid IS NULL');
      console.log('Fixed inventorystockinserial guid');
    } catch(e) {}

    try {
      await dest.query('UPDATE newdb.order_items SET itemVariantId = modelGuid WHERE modelGuid IS NOT NULL AND itemVariantId IS NULL');
      console.log('Fixed order_items itemVariantId');
    } catch(e) {}

    await dest.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    source.end();
    dest.end();
  }
}

run();
