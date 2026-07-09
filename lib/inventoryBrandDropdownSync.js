import { v4 as uuidv4 } from "uuid";

// Keep the generic COMPANY dropdown (dropdown_master/dropdown_option) in sync
// with brands flagged "Show in Models" — add/reactivate on yes, deactivate on no.
export async function syncBrandInCompanyDropdown(pool, brandName, showInModels) {
  const [[master]] = await pool.query("SELECT id FROM dropdown_master WHERE dropdown_code = 'COMPANY' LIMIT 1");
  if (!master) return;
  const [existing] = await pool.query(
    "SELECT id FROM dropdown_option WHERE dropdown_id = ? AND option_value = ? LIMIT 1",
    [master.id, brandName]
  );
  if (showInModels) {
    if (existing.length) {
      await pool.query("UPDATE dropdown_option SET is_active = 1, option_label = ? WHERE id = ?", [brandName, existing[0].id]);
    } else {
      await pool.query(
        "INSERT INTO dropdown_option (guid, dropdown_id, option_label, option_value, is_active) VALUES (?, ?, ?, ?, 1)",
        [uuidv4(), master.id, brandName, brandName]
      );
    }
  } else if (existing.length) {
    await pool.query("UPDATE dropdown_option SET is_active = 0 WHERE id = ?", [existing[0].id]);
  }
}
