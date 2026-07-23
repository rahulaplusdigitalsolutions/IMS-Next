const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function modernizeInventory() {
  const c = await mysql.createConnection({ host: 'localhost', user: 'Rahul', password: 'Rahul@3820', database: 'newdb' });

  try {
    console.log("Starting inventory modernization in newdb...");

    // Get the correct Aplus company Guid
    const [cRows] = await c.query("SELECT guid FROM companies WHERE name='Aplus' AND isActive=1 LIMIT 1");
    if (cRows.length === 0) throw new Error("Aplus company not found!");
    const companyGuid = cRows[0].guid;

    const unitId = "u_nos";
    await c.query("INSERT IGNORE INTO inventoryunitmaster (unitId, unitName) VALUES ('u_nos', 'Nos')");

    const catId = uuidv4();
    await c.query("INSERT INTO inventorycategorymaster (categoryId, categoryName, status, isDeleted, createdAt, companyGuid, showMrp) VALUES (?, 'Printers', 1, 0, NOW(), ?, 1)", [catId, companyGuid]);
    
    const brandId = uuidv4();
    await c.query("INSERT INTO inventorybrandmaster (brandId, brandName, status, isDeleted, createdAt, companyGuid, showInModels) VALUES (?, 'Generic', 1, 0, NOW(), ?, 1)", [brandId, companyGuid]);

    const printerItemId = uuidv4();
    await c.query(`
      INSERT INTO inventoryitemmaster 
      (itemId, categoryId, brandId, itemName, unitId, isTrackable, useSerialTab, status, isDeleted, createdAt, companyGuid)
      VALUES (?, ?, ?, 'Printer', ?, 1, 1, 1, 0, NOW(), ?)
    `, [printerItemId, catId, brandId, unitId, companyGuid]);
    
    console.log("Created Printer Item Master. Migrating models...");

    const [models] = await c.query("SELECT * FROM models WHERE isDeleted = 0");
    const oldModelToVariantMap = {};
    
    for (const m of models) {
      const variantId = m.guid; 
      oldModelToVariantMap[m.guid] = variantId;

      await c.query(`
        INSERT INTO inventoryitemvariant 
        (itemVariantId, itemId, variantName, sku, purchasePrice, sellingPrice, stockQty, status, isDeleted, createdAt, companyGuid)
        VALUES (?, ?, ?, ?, 0, ?, ?, 1, 0, NOW(), ?)
        ON DUPLICATE KEY UPDATE variantName=VALUES(variantName)
      `, [variantId, printerItemId, m.name, m.barcode || null, m.mrp || 0, m.stockQuantity || 0, companyGuid]);

      await c.query(`
        INSERT INTO inventoryvariantstock 
        (itemVariantId, availablePCS, avgPurchaseRate, lastPurchaseRate, lastUpdatedOn)
        VALUES (?, ?, 0, 0, NOW())
        ON DUPLICATE KEY UPDATE availablePCS=VALUES(availablePCS)
      `, [variantId, m.stockQuantity || 0]);
    }
    console.log(`Migrated ${models.length} models into inventoryitemvariant.`);

    console.log("Migrating serials...");
    const [serials] = await c.query("SELECT * FROM serials WHERE isDeleted = 0");
    
    if (serials.length > 0) {
      const stockInId = uuidv4();
      await c.query(`
        INSERT INTO inventorystockin 
        (stockInId, invoiceNo, invoiceDate, status, totalAmount, isDeleted, createdAt, createdBy, finalizedOn, remarks, companyGuid)
        VALUES (?, 'OLD-MODELS-STOCK', NOW(), 1, 0, 0, NOW(), 'MIGRATION', NOW(), 'Migrated from Old Models', ?)
      `, [stockInId, companyGuid]);

      const [gdRows] = await c.query("SELECT guid FROM godowns WHERE isDeleted=0 LIMIT 1");
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

      // Check if inventorystockinserial has guid
      let hasGuid = true;
      try {
        await c.query("SELECT guid FROM inventorystockinserial LIMIT 1");
      } catch (e) {
        hasGuid = false;
        try {
          await c.query("ALTER TABLE inventorystockinserial ADD COLUMN guid CHAR(36) NULL");
          console.log("Added guid column to inventorystockinserial");
        } catch(ex) {}
      }

      for (const group of Object.values(serialsGrouped)) {
        const { modelGuid, godownGuid, landingPrice, serials: sList } = group;
        const variantId = oldModelToVariantMap[modelGuid];
        if (!variantId) continue;

        const stockInDetailId = uuidv4();
        const receiveQty = sList.length;
        const totalPrice = receiveQty * landingPrice;
        totalStockInAmount += totalPrice;

        await c.query(`
          INSERT INTO inventorystockindetail 
          (stockInDetailId, stockInId, itemVariantId, receiveQty, unitPrice, totalPrice, createdAt, unitId, stockInQty, defaultPcsQty, finalPcsQty, pcsQty, purchaseRate, status, modelGuid, godownGuid, companyGuid)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, 1, ?, ?, ?, 1, ?, ?, ?)
        `, [stockInDetailId, stockInId, variantId, receiveQty, landingPrice, totalPrice, unitId, receiveQty, receiveQty, receiveQty, landingPrice, modelGuid, godownGuid, companyGuid]);

        for (const s of sList) {
          const serialId = s.guid || uuidv4();
          await c.query(`
            INSERT IGNORE INTO inventorystockinserial 
            (guid, serialId, stockInDetailId, itemVariantId, serialNumber, isUsed, isDeleted, createdAt, status, isSold, companyGuid)
            VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), 1, ?, ?)
          `, [serialId, serialId, stockInDetailId, variantId, s.value, (s.status === 'sold' ? 1 : 0), (s.status === 'sold' ? 1 : 0), companyGuid]);
        }
        
        if (landingPrice > 0) {
          await c.query(`
            UPDATE inventoryvariantstock 
            SET lastPurchaseRate = ?, avgPurchaseRate = ? 
            WHERE itemVariantId = ?
          `, [landingPrice, landingPrice, variantId]);
          
          await c.query(`
            UPDATE inventoryitemvariant
            SET purchasePrice = ?
            WHERE itemVariantId = ? AND purchasePrice = 0
          `, [landingPrice, variantId]);
        }
      }

      await c.query(`
        UPDATE inventorystockin 
        SET totalAmount = ? 
        WHERE stockInId = ?
      `, [totalStockInAmount, stockInId]);
      
      console.log(`Migrated ${serials.length} serials into stock in.`);
    }

    console.log("Inventory Modernization Completed!");

  } catch (err) {
    console.error("Modernization failed:", err);
  } finally {
    await c.end();
  }
}

modernizeInventory();
