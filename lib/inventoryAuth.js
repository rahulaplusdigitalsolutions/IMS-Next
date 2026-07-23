import { authorizeReadWrite } from "@/lib/auth";

// Covers every /Inventory/* route (categories, brands, items, stock-in,
// current stock, combos, vendors, etc). Read access: stat_current_stock
// permission (every non-Admin role already has it). Write access:
// allow_edit_inventory edit-flag. Delete: Admin only.
export const authorizeInventory = (user, method) =>
  authorizeReadWrite(user, method, {
    permission: "stat_current_stock",
    editColumnName: "allow_edit_inventory",
    adminOnlyDelete: true,
    denyMessage: "You do not have permission to manage inventory.",
  });
