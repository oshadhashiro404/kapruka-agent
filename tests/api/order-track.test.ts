import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/services/mcp", () => ({
  trackOrder: vi.fn().mockResolvedValue({
    order_number: "VPAY827982BA",
    status: "Out for delivery",
    recipient: "Nimal Perera",
    delivery_progress: [
      { status: "Order placed", timestamp: "2026-06-20" },
      { status: "Out for delivery", timestamp: "2026-06-21" },
    ],
  }),
}));

import { POST } from "@/app/api/order/track/route";
import { trackOrder } from "@/lib/server/services/mcp";

describe("POST /api/order/track", () => {
  it("rejects invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/order/track", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing order number", async () => {
    const res = await POST(
      new Request("http://localhost/api/order/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns tracking payload on success", async () => {
    const res = await POST(
      new Request("http://localhost/api/order/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: "vpay827982ba" }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tracking.order_number).toBe("VPAY827982BA");
    expect(data.tracking.status).toBe("Out for delivery");
    expect(trackOrder).toHaveBeenCalledWith("VPAY827982BA");
  });
});
