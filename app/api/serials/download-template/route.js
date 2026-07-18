import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireCompany } from "@/lib/auth";
import { authorizeSerials } from "@/lib/serialsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeSerials(user, "GET");

  const [models] = await mysqlPool.query("SELECT guid as id, name, company, mrp FROM models WHERE isDeleted=0 AND companyGuid=? ORDER BY name", [user.companyId]);
  const [godowns] = await mysqlPool.query("SELECT guid, godownName, godownAddress FROM godowns WHERE isDeleted=0 AND companyGuid=? ORDER BY isDefault DESC, godownName ASC", [user.companyId]);

  const wb = xlsx.utils.book_new();
  const tpl = xlsx.utils.json_to_sheet([{ modelId: "paste-model-guid-here", "Model Name (For Reference)": "", godownGuid: "optional-godown-guid", "Godown Name (For Reference)": "", value: "SAMPLE-SER-001", landingPrice: 25000, status: "Available", landingPriceReason: "" }]);
  tpl["!cols"] = [{ wch: 38 }, { wch: 25 }, { wch: 38 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  xlsx.utils.book_append_sheet(wb, tpl, "1. Upload Serials Here");

  const mSheet = xlsx.utils.json_to_sheet(models.map((m) => ({ "Model ID": m.id, "Model Name": m.name, Company: m.company, MRP: m.mrp })));
  mSheet["!cols"] = [{ wch: 38 }, { wch: 30 }, { wch: 20 }, { wch: 12 }];
  xlsx.utils.book_append_sheet(wb, mSheet, "2. Find Model IDs Here");

  const gSheet = xlsx.utils.json_to_sheet(godowns.map((g) => ({ "Godown GUID": g.guid, "Godown Name": g.godownName, Address: g.godownAddress || "" })));
  gSheet["!cols"] = [{ wch: 38 }, { wch: 30 }, { wch: 40 }];
  xlsx.utils.book_append_sheet(wb, gSheet, "3. Find Godowns Here");

  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=serial_upload_template.xlsx",
    },
  });
});
