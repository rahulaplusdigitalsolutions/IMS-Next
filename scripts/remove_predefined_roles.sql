-- Converts the old hardcoded base-tier roles (Supervisor/Accountant/Operator/User)
-- into ordinary, fully admin-editable/deletable roles. Their guid, permissions,
-- and editPermissions are untouched, so every user already assigned to one of
-- these roles keeps identical access — this only removes their special
-- "cannot rename/delete" protection.
UPDATE roles SET isBaseTier = 0 WHERE isBaseTier = 1;
