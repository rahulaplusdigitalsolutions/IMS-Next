const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function run() {
  const source = await mysql.createConnection({ host: 'localhost', user: 'Rahul', password: 'Rahul@3820', database: 'dbo' });
  const dest = await mysql.createConnection({ host: 'localhost', user: 'Rahul', password: 'Rahul@3820', database: 'newdb' });

  try {
    console.log("Starting full data migration from dbo to newdb...");

    const [tables] = await dest.query('SHOW TABLES');
    const tableNames = tables.map(r => Object.values(r)[0]);
    await dest.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of tableNames) {
      await dest.query(`TRUNCATE TABLE \`${t}\``);
    }
    await dest.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log("Truncated all newdb tables.");

    // 1. Create Aplus company
    const companyGuid = uuidv4();
    await dest.query(`
      INSERT INTO companies (guid, name, isActive, createdAt, updatedAt)
      VALUES (?, 'Aplus', 1, NOW(), NOW())
    `, [companyGuid]);
    console.log("Created Aplus company:", companyGuid);

    // Function to safely copy a table, mapping companyGuid if the column exists
    async function copyTable(table, requireCompany = false) {
      try {
        await dest.query(`CREATE TABLE IF NOT EXISTS newdb.\`${table}\` LIKE dbo.\`${table}\``);
        
        const [dCols] = await source.query('DESCRIBE ' + table);
        const [nCols] = await dest.query('DESCRIBE ' + table);
        
        const dNames = dCols.map(c=>c.Field);
        const nNames = nCols.map(c=>c.Field);
        
        const common = dNames.filter(n=>nNames.includes(n));
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
        
        const q = `INSERT IGNORE INTO newdb.${table} (\`${insCols.join('`, `')}\`) SELECT ${selCols.join(', ')} FROM dbo.${table}`;
        await dest.query(q);
        console.log(`Copied ${table}`);
      } catch (err) {
        console.log(`Skipping table ${table}: ${err.message}`);
      }
    }

    // 2. Transfer general data
    await copyTable('users', true);
    await copyTable('roles', true);
    await copyTable('user_companies');
    
    // For user_companies, we need to map them to the new company
    try {
      await dest.query('UPDATE user_companies SET companyId = ?', [companyGuid]);
    } catch(e) {}
    
    await copyTable('dropdown_master');
    await copyTable('dropdown_option');
    await copyTable('godowns', true);
    
    // 3. Inventory Modernization
    const unitId = "u_nos";
    await dest.query("INSERT IGNORE INTO inventoryunitmaster (unitId, unitName) VALUES ('u_nos', 'Nos')");

    console.log("Fetching old models from dbo...");
    const [models] = await source.query("SELECT * FROM models WHERE isDeleted = 0");
    
    const catId = uuidv4();
    await dest.query("INSERT INTO inventorycategorymaster (categoryId, categoryName, status, isDeleted, createdAt, companyGuid, showMrp) VALUES (?, 'Printers', 1, 0, NOW(), ?, 1)", [catId, companyGuid]);
    
    const brandId = uuidv4();
    await dest.query("INSERT INTO inventorybrandmaster (brandId, brandName, status, isDeleted, createdAt, companyGuid, showInModels) VALUES (?, 'Generic', 1, 0, NOW(), ?, 1)", [brandId, companyGuid]);

    const printerItemId = uuidv4();
    await dest.query(`
      INSERT INTO inventoryitemmaster 
      (itemId, categoryId, brandId, itemName, unitId, isTrackable, useSerialTab, status, isDeleted, createdAt, companyGuid)
      VALUES (?, ?, ?, 'Printer', ?, 1, 1, 1, 0, NOW(), ?)
    `, [printerItemId, catId, brandId, unitId, companyGuid]);
    
    const oldModelToVariantMap = {};
    for (const m of models) {
      const variantId = m.guid; 
      oldModelToVariantMap[m.guid] = variantId;

      await dest.query(`
        INSERT INTO inventoryitemvariant 
        (itemVariantId, itemId, variantName, sku, purchasePrice, sellingPrice, stockQty, status, isDeleted, createdAt, companyGuid)
        VALUES (?, ?, ?, ?, 0, ?, ?, 1, 0, NOW(), ?)
      `, [variantId, printerItemId, m.name, m.barcode || null, m.mrp || 0, m.stockQuantity || 0, companyGuid]);

      await dest.query(`
        INSERT INTO inventoryvariantstock 
        (itemVariantId, availablePCS, avgPurchaseRate, lastPurchaseRate, lastUpdatedOn)
        VALUES (?, ?, 0, 0, NOW())
      `, [variantId, m.stockQuantity || 0]);
    }

    console.log("Fetching old serials from dbo...");
    const [serials] = await source.query("SELECT * FROM serials WHERE isDeleted = 0");
    
    if (serials.length > 0) {
      const stockInId = uuidv4();
      await dest.query(`
        INSERT INTO inventorystockin 
        (stockInId, invoiceNo, invoiceDate, status, totalAmount, isDeleted, createdAt, createdBy, finalizedOn, remarks)
        VALUES (?, 'OLD-MODELS-STOCK', NOW(), 1, 0, 0, NOW(), 'MIGRATION', NOW(), 'Migrated from Old Models')
      `, [stockInId]);

      const [gdRows] = await dest.query("SELECT guid FROM godowns WHERE isDeleted=0 LIMIT 1");
      const defaultGodownGuid = gdRows.length > 0 ? gdRows[0].guid : null;

      const serialsGrouped = {};
      let totalStockInAmount = 0;

      for (const s of serials) {
        if (!s.modelGuid) continue;
        const gGuid = s.godownGuid || defaultGodownGuid;
        const price = parseFloat(s.landingPrice) || 0;
        const key = `${s.modelGuid}_${gGuid}_${price}`;
        if (!serialsGrouped[key]) {
          serialsGrouped[key] = { modelGuid: s.modelGuid, godownGuid: gGuid, landingPrice: price, serials: [] };
        }
        serialsGrouped[key].serials.push(s);
      }

      for (const group of Object.values(serialsGrouped)) {
        const { modelGuid, godownGuid, landingPrice, serials: sList } = group;
        const variantId = oldModelToVariantMap[modelGuid];
        if (!variantId) continue;

        const stockInDetailId = uuidv4();
        const receiveQty = sList.length;
        const totalPrice = receiveQty * landingPrice;
        totalStockInAmount += totalPrice;

        await dest.query(`
          INSERT INTO inventorystockindetail 
          (stockInDetailId, stockInId, itemVariantId, receiveQty, unitPrice, totalPrice, createdAt, unitId, stockInQty, defaultPcsQty, finalPcsQty, pcsQty, purchaseRate, status, modelGuid, godownGuid)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, 1, ?, ?, ?, 1, ?, ?)
        `, [stockInDetailId, stockInId, variantId, receiveQty, landingPrice, totalPrice, unitId, receiveQty, receiveQty, receiveQty, landingPrice, modelGuid, godownGuid]);

        for (const s of sList) {
          const serialId = s.guid || uuidv4();
          await dest.query(`
            INSERT IGNORE INTO inventorystockinserial 
            (serialId, stockInDetailId, itemVariantId, serialNumber, isUsed, isDeleted, createdAt, status, isSold)
            VALUES (?, ?, ?, ?, ?, 0, NOW(), 1, ?)
          `, [serialId, stockInDetailId, variantId, s.value, (s.status === 'sold' ? 1 : 0), (s.status === 'sold' ? 1 : 0)]);
        }
        
        if (landingPrice > 0) {
          await dest.query(`
            UPDATE inventoryvariantstock 
            SET lastPurchaseRate = ?, avgPurchaseRate = ? 
            WHERE itemVariantId = ?
          `, [landingPrice, landingPrice, variantId]);
          
          await dest.query(`
            UPDATE inventoryitemvariant
            SET purchasePrice = ?
            WHERE itemVariantId = ? AND purchasePrice = 0
          `, [landingPrice, variantId]);
        }
      }

      await dest.query(`
        UPDATE inventorystockin 
        SET totalAmount = ? 
        WHERE stockInId = ?
      `, [totalStockInAmount, stockInId]);
    }

    // 4. Backward Compatibility (Orders)
    await copyTable('models', true);
    await copyTable('serials', true);
    
    // Fix itemVariantId in serials
    try {
      await dest.query('ALTER TABLE serials ADD COLUMN itemVariantId VARCHAR(255) NULL');
    } catch(e) {}
    await dest.query('UPDATE serials SET itemVariantId = modelGuid WHERE itemVariantId IS NULL');

    // 5. Orders & Logistics
    await copyTable('orders', true);
    await copyTable('order_items', true);
    await copyTable('order_installations', true);
    await copyTable('order_logistics', true);
    await copyTable('orderdocuments', true);
    await copyTable('payments', true);
    await copyTable('returns', true);

    console.log("Migration completed successfully!");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await source.end();
    await dest.end();
  }
}

run();
