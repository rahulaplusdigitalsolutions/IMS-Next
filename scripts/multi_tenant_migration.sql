-- 1. Create Companies Table
CREATE TABLE companies (
  guid CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  allowedPlatforms JSON NULL,
  isActive TINYINT(1) DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Create User-Companies Join Table
CREATE TABLE user_companies (
  userGuid CHAR(36) NOT NULL,
  companyGuid CHAR(36) NOT NULL,
  isDefault TINYINT(1) DEFAULT 0,
  PRIMARY KEY (userGuid, companyGuid)
);

-- 3. Insert Default Company
SET @default_company_guid = UUID();
INSERT INTO companies (guid, name, allowedPlatforms) 
VALUES (@default_company_guid, 'Default Company', NULL);

-- 4. Assign All Existing Users to Default Company
INSERT INTO user_companies (userGuid, companyGuid, isDefault)
SELECT userid, @default_company_guid, 1 FROM users;

-- 5. Helper macro to add column, backfill, and alter (done manually for each table due to MySQL limitations in scripts without procedures)
-- The list of tables:
-- models, serials, godowns, orders, order_items, order_logistics, order_installations, orderdocuments, 
-- payments, returns, serialmovements, stocktransferhistory, notifications, bulkorders, bulkorderitems, 
-- bulkorderinvoices, bulkorderdispatches, bulkorderpayments, replacementhistory, useractivitylogs, wc_certs, 
-- warranty_template, inventoryitemmaster, inventoryitemvariant, inventorystockout, inventorystockoutdetail, 
-- inventorybrandmaster, fbf_fba_stock, fbf_fba_transactions

-- Add column, backfill, then enforce NOT NULL and create index for each table
-- Models
ALTER TABLE models ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE models SET companyGuid = @default_company_guid;
ALTER TABLE models MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Serials
ALTER TABLE serials ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE serials SET companyGuid = @default_company_guid;
ALTER TABLE serials MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Godowns
ALTER TABLE godowns ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE godowns SET companyGuid = @default_company_guid;
ALTER TABLE godowns MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Orders
ALTER TABLE orders ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE orders SET companyGuid = @default_company_guid;
ALTER TABLE orders MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Order Items
ALTER TABLE order_items ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE order_items SET companyGuid = @default_company_guid;
ALTER TABLE order_items MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Order Logistics
ALTER TABLE order_logistics ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE order_logistics SET companyGuid = @default_company_guid;
ALTER TABLE order_logistics MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Order Installations
ALTER TABLE order_installations ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE order_installations SET companyGuid = @default_company_guid;
ALTER TABLE order_installations MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Order Documents
ALTER TABLE orderdocuments ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE orderdocuments SET companyGuid = @default_company_guid;
ALTER TABLE orderdocuments MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Payments
ALTER TABLE payments ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE payments SET companyGuid = @default_company_guid;
ALTER TABLE payments MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Returns
ALTER TABLE returns ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE returns SET companyGuid = @default_company_guid;
ALTER TABLE returns MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Serial Movements
ALTER TABLE serialmovements ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE serialmovements SET companyGuid = @default_company_guid;
ALTER TABLE serialmovements MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Stock Transfer History
ALTER TABLE stocktransferhistory ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE stocktransferhistory SET companyGuid = @default_company_guid;
ALTER TABLE stocktransferhistory MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Notifications
ALTER TABLE notifications ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE notifications SET companyGuid = @default_company_guid;
ALTER TABLE notifications MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Bulk Orders
ALTER TABLE bulkorders ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE bulkorders SET companyGuid = @default_company_guid;
ALTER TABLE bulkorders MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Bulk Order Items
ALTER TABLE bulkorderitems ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE bulkorderitems SET companyGuid = @default_company_guid;
ALTER TABLE bulkorderitems MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Bulk Order Invoices
ALTER TABLE bulkorderinvoices ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE bulkorderinvoices SET companyGuid = @default_company_guid;
ALTER TABLE bulkorderinvoices MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Bulk Order Dispatches
ALTER TABLE bulkorderdispatches ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE bulkorderdispatches SET companyGuid = @default_company_guid;
ALTER TABLE bulkorderdispatches MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Bulk Order Payments
ALTER TABLE bulkorderpayments ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE bulkorderpayments SET companyGuid = @default_company_guid;
ALTER TABLE bulkorderpayments MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Replacement History
ALTER TABLE replacementhistory ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE replacementhistory SET companyGuid = @default_company_guid;
ALTER TABLE replacementhistory MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- User Activity Logs
ALTER TABLE useractivitylogs ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE useractivitylogs SET companyGuid = @default_company_guid;
ALTER TABLE useractivitylogs MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- WC Certs
ALTER TABLE wc_certs ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE wc_certs SET companyGuid = @default_company_guid;
ALTER TABLE wc_certs MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Warranty Template
ALTER TABLE warranty_template ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE warranty_template SET companyGuid = @default_company_guid;
ALTER TABLE warranty_template MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Inventory Item Master
ALTER TABLE inventoryitemmaster ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventoryitemmaster SET companyGuid = @default_company_guid;
ALTER TABLE inventoryitemmaster MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Inventory Item Variant
ALTER TABLE inventoryitemvariant ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventoryitemvariant SET companyGuid = @default_company_guid;
ALTER TABLE inventoryitemvariant MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Inventory Stock Out
ALTER TABLE inventorystockout ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventorystockout SET companyGuid = @default_company_guid;
ALTER TABLE inventorystockout MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Inventory Stock Out Detail
ALTER TABLE inventorystockoutdetail ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventorystockoutdetail SET companyGuid = @default_company_guid;
ALTER TABLE inventorystockoutdetail MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Inventory Brand Master
ALTER TABLE inventorybrandmaster ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventorybrandmaster SET companyGuid = @default_company_guid;
ALTER TABLE inventorybrandmaster MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- FBF FBA Stock
ALTER TABLE fbf_fba_stock ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE fbf_fba_stock SET companyGuid = @default_company_guid;
ALTER TABLE fbf_fba_stock MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- FBF FBA Transactions
ALTER TABLE fbf_fba_transactions ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE fbf_fba_transactions SET companyGuid = @default_company_guid;
ALTER TABLE fbf_fba_transactions MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

