import { describe, expect, it } from "vitest";
import { parseKaprukaTrackResult } from "@/lib/server/services/mcp";

describe("parseKaprukaTrackResult", () => {
  it("parses JSON object with tracking fields", () => {
    const result = parseKaprukaTrackResult(
      {
        order_number: "VPAY827982BA",
        status: "Delivered",
        recipient: "Kamal Silva",
        delivery_progress: [
          { status: "Shipped", timestamp: "2026-06-20" },
          { status: "Delivered", timestamp: "2026-06-21" },
        ],
        items: [{ name: "Rose bouquet", quantity: 1 }],
      },
      "VPAY827982BA"
    );
    expect(result.order_number).toBe("VPAY827982BA");
    expect(result.status).toBe("Delivered");
    expect(result.recipient).toBe("Kamal Silva");
    expect(result.delivery_progress).toHaveLength(2);
    expect(result.items?.[0]?.name).toBe("Rose bouquet");
  });

  it("parses markdown tracking response", () => {
    const md = `
**Status**: Out for delivery
**Recipient**: Nimal Perera
- Order placed — 2026-06-20
- Out for delivery — 2026-06-21
`;
    const result = parseKaprukaTrackResult(md, "VPAY827982BA");
    expect(result.status).toBe("Out for delivery");
    expect(result.recipient).toBe("Nimal Perera");
    expect(result.delivery_progress?.length).toBeGreaterThan(0);
  });

  it("uses fallback order number when nested in result string", () => {
    const result = parseKaprukaTrackResult(
      JSON.stringify({
        status: "Processing",
        order_id: "VPAY827982BA",
      }),
      "VPAY827982BA"
    );
    expect(result.order_number).toBe("VPAY827982BA");
    expect(result.status).toBe("Processing");
  });

  it("parses Kapruka markdown heading/table style response", () => {
    const md = `## Order \`VPAY827982BA\` — Delivered

| | |
|---|---|
| Total | {'value': '26060', 'currency': 'LKR'} |
| Payment | 3645 |

**Delivering to**
- MS. GAYATHRI FERNANDO

**Progress**
- JUN 23, 2026 4:40 PM — Order Confirmed and Awaiting preparation
- JUN 24, 2026 6:00 PM — Delivered
`;

    const result = parseKaprukaTrackResult(md, "VPAY827982BA");
    expect(result.order_number).toBe("VPAY827982BA");
    expect(result.status).toBe("Delivered");
    expect(result.recipient).toMatch(/GAYATHRI/i);
    expect(result.delivery_progress?.length).toBeGreaterThan(0);
  });

  it("throws meaningful Kapruka errors for invalid tracking", () => {
    expect(() =>
      parseKaprukaTrackResult(
        "Error (not_found): We couldn't find this order number",
        "BAD123"
      )
    ).toThrow(/couldn't find this order/i);
  });
});
