const mysql = require('mysql2/promise');

async function copyMonitor() {
  const cTemp = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'tempdb'});
  const cNew = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});

  try {
    const companyGuid = 'b1f50794-7369-4726-b39e-1c240f128fcb';

    // Copy Category
    const [cats] = await cTemp.query('SELECT * FROM inventorycategorymaster WHERE categoryId=?', ['7c0865c6-6e78-4e6f-bfee-978dd0f7b151']);
    if (cats.length > 0) {
      const cat = cats[0];
      await cNew.query('INSERT IGNORE INTO inventorycategorymaster (categoryId, categoryName, status, isDeleted, createdAt, companyGuid, showMrp) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [cat.categoryId, cat.categoryName, cat.status, cat.isDeleted, cat.createdAt, companyGuid, cat.showMrp]);
    }

    // Copy Brand
    const [brands] = await cTemp.query('SELECT * FROM inventorybrandmaster WHERE brandId=?', ['BRD-1778558949753']);
    if (brands.length > 0) {
      const brand = brands[0];
      await cNew.query('INSERT IGNORE INTO inventorybrandmaster (brandId, brandName, status, isDeleted, createdAt, createdBy, showInModels, companyGuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [brand.brandId, brand.brandName, brand.status, brand.isDeleted, brand.createdAt, brand.createdBy, brand.showInModels, companyGuid]);
    }

    // Copy Item Master
    const [items] = await cTemp.query('SELECT * FROM inventoryitemmaster WHERE itemId=?', ['6f4a349b-ca1a-45c3-ab07-7c414061ba08']);
    if (items.length > 0) {
      const item = items[0];
      await cNew.query(`INSERT IGNORE INTO inventoryitemmaster 
        (itemId, categoryId, brandId, itemName, itemCode, hsnCode, unitId, isTrackable, status, isDeleted, createdAt, createdBy, useSerialTab, companyGuid) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [item.itemId, item.categoryId, item.brandId, item.itemName, item.itemCode, item.hsnCode, item.unitId, item.isTrackable, item.status, item.isDeleted, item.createdAt, item.createdBy, item.useSerialTab, companyGuid]);
    }

    // Copy Variants
    const [variants] = await cTemp.query('SELECT * FROM inventoryitemvariant WHERE itemId=?', ['6f4a349b-ca1a-45c3-ab07-7c414061ba08']);
    for (const v of variants) {
      await cNew.query(`INSERT IGNORE INTO inventoryitemvariant 
        (itemVariantId, itemId, variantName, sku, sellingPrice, status, isDeleted, createdAt, createdBy, companyGuid) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [v.itemVariantId, v.itemId, v.variantName, v.sku, v.sellingPrice, 1, v.isDeleted, v.createdAt, v.createdBy, companyGuid]);
    }

    console.log('Successfully copied Monitor item and its variants to newdb!');

  } catch(e) {
    console.error(e);
  } finally {
    cTemp.end();
    cNew.end();
  }
}

copyMonitor();
