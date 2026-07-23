const mysql = require('mysql2/promise');

async function testQ() {
  const c = await mysql.createConnection({host:'localhost', user:'Rahul', password:'Rahul@3820', database:'newdb'});
  try {
    const q = `
      SELECT o.guid 
      FROM order_items oi 
      JOIN orders o ON oi.orderGuid=o.guid AND o.companyGuid=?
      LEFT JOIN order_logistics ol ON o.guid=ol.orderGuid AND ol.companyGuid=?
      LEFT JOIN order_installations ins ON o.guid=ins.orderGuid AND ins.companyGuid=?
      LEFT JOIN inventorystockinserial s ON oi.serialNumberGuid=s.guid AND s.companyGuid=?
      LEFT JOIN inventoryitemvariant itv ON COALESCE(oi.itemVariantId, s.itemVariantId)=itv.itemVariantId AND itv.companyGuid=?
      LEFT JOIN inventoryitemmaster iim ON itv.itemId=iim.itemId AND iim.companyGuid=?
      LEFT JOIN inventorybrandmaster ib ON iim.brandId=ib.brandId AND ib.companyGuid=?
      LEFT JOIN (SELECT serialNumberGuid, MAX(serialValue) as serialValue FROM serialmovements GROUP BY serialNumberGuid) sm ON oi.serialNumberGuid=sm.serialNumberGuid
      LEFT JOIN payments p ON oi.guid=p.dispatchGuid AND p.companyGuid=?
      WHERE oi.companyGuid=?
    `;
    const cid = 'd4fee155-7ea9-43e8-b816-077cdc2e58eb';
    const [rows] = await c.query(q, Array(9).fill(cid));
    console.log('Returned rows:', rows.length);
  } catch(e) {
    console.error(e);
  } finally {
    c.end();
  }
}
testQ();
