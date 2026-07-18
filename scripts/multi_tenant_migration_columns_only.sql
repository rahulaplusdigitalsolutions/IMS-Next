-- Adds companyGuid to remaining tables and backfills into the existing "Aplus" company.
-- companies/user_companies already exist with real data; this script does NOT touch them.
SET @default_company_guid = 'f86ec80b-7c31-11f1-be92-f8fe5e230b62';

ALTER TABLE models ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE models SET companyGuid = @default_company_guid;
ALTER TABLE models MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE serials ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE serials SET companyGuid = @default_company_guid;
ALTER TABLE serials MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE godowns ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE godowns SET companyGuid = @default_company_guid;
ALTER TABLE godowns MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE orders ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE orders SET companyGuid = @default_company_guid;
ALTER TABLE orders MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE order_items ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE order_items SET companyGuid = @default_company_guid;
ALTER TABLE order_items MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE order_logistics ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE order_logistics SET companyGuid = @default_company_guid;
ALTER TABLE order_logistics MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE order_installations ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE order_installations SET companyGuid = @default_company_guid;
ALTER TABLE order_installations MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE orderdocuments ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE orderdocuments SET companyGuid = @default_company_guid;
ALTER TABLE orderdocuments MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE payments ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE payments SET companyGuid = @default_company_guid;
ALTER TABLE payments MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE returns ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE returns SET companyGuid = @default_company_guid;
ALTER TABLE returns MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE serialmovements ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE serialmovements SET companyGuid = @default_company_guid;
ALTER TABLE serialmovements MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE stocktransferhistory ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE stocktransferhistory SET companyGuid = @default_company_guid;
ALTER TABLE stocktransferhistory MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE notifications ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE notifications SET companyGuid = @default_company_guid;
ALTER TABLE notifications MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE replacementhistory ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE replacementhistory SET companyGuid = @default_company_guid;
ALTER TABLE replacementhistory MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE useractivitylogs ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE useractivitylogs SET companyGuid = @default_company_guid;
ALTER TABLE useractivitylogs MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE wc_certs ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE wc_certs SET companyGuid = @default_company_guid;
ALTER TABLE wc_certs MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE warranty_template ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE warranty_template SET companyGuid = @default_company_guid;
ALTER TABLE warranty_template MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE inventoryitemmaster ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventoryitemmaster SET companyGuid = @default_company_guid;
ALTER TABLE inventoryitemmaster MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE inventoryitemvariant ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventoryitemvariant SET companyGuid = @default_company_guid;
ALTER TABLE inventoryitemvariant MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE inventorystockout ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventorystockout SET companyGuid = @default_company_guid;
ALTER TABLE inventorystockout MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE inventorystockoutdetail ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventorystockoutdetail SET companyGuid = @default_company_guid;
ALTER TABLE inventorystockoutdetail MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE inventorybrandmaster ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventorybrandmaster SET companyGuid = @default_company_guid;
ALTER TABLE inventorybrandmaster MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE fbf_fba_stock ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE fbf_fba_stock SET companyGuid = @default_company_guid;
ALTER TABLE fbf_fba_stock MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE fbf_fba_transactions ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE fbf_fba_transactions SET companyGuid = @default_company_guid;
ALTER TABLE fbf_fba_transactions MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

-- Found missing during runtime testing (not in original table list):
ALTER TABLE inventoryvendor ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventoryvendor SET companyGuid = @default_company_guid;
ALTER TABLE inventoryvendor MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);

ALTER TABLE inventorystationeryreturns ADD COLUMN companyGuid CHAR(36) NULL;
UPDATE inventorystationeryreturns SET companyGuid = @default_company_guid;
ALTER TABLE inventorystationeryreturns MODIFY companyGuid CHAR(36) NOT NULL, ADD INDEX(companyGuid);
