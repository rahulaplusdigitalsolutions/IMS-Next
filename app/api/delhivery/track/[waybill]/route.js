import { NextResponse } from "next/server";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { delhiveryRequest } from "@/lib/delhivery";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  const { waybill } = await params;

  if (!waybill?.trim()) return NextResponse.json({ message: "waybill is required." }, { status: 400 });

  try {
    const result = await delhiveryRequest(`/api/v1/packages/json/?waybill=${encodeURIComponent(waybill.trim())}`);
    const shipment = result?.ShipmentData?.[0]?.Shipment;
    if (!shipment) {
      return NextResponse.json({ message: "No tracking data found for this waybill.", response: result }, { status: 404 });
    }

    return NextResponse.json({
      waybill: shipment.AWB,
      status: shipment.Status?.Status,
      statusType: shipment.Status?.StatusType,
      statusLocation: shipment.Status?.StatusLocation,
      statusDateTime: shipment.Status?.StatusDateTime,
      scans: (shipment.Scans || []).map((s) => ({
        status: s.ScanDetail?.Scan,
        location: s.ScanDetail?.ScannedLocation,
        dateTime: s.ScanDetail?.ScanDateTime,
        instructions: s.ScanDetail?.Instructions,
      })),
      response: result,
    });
  } catch (err) {
    return NextResponse.json({ message: err.message, response: err.payload || null }, { status: err.status || 500 });
  }
});
