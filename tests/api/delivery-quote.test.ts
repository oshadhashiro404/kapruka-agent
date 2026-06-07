import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/services/mcp", () => ({
  quoteDeliveryByCityName: vi.fn().mockResolvedValue({
    deliverable: true,
    city: "Colombo",
    city_code: "CMB",
    delivery_date: "2099-06-01",
    delivery_cost_lkr: 400,
    estimated_arrival: "Next day",
    is_perishable: false,
  }),
}));

import { POST } from "@/app/api/delivery/quote/route";

describe("POST /api/delivery/quote", () => {
  it("rejects invalid JSON", async () => {
    const res = await POST(new Request("http://localhost/api/delivery/quote", {
      method: "POST",
      body: "{",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects schema validation failure", async () => {
    const res = await POST(new Request("http://localhost/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: "", date: "bad", product_code: "" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns quote shape", async () => {
    const res = await POST(new Request("http://localhost/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: "Colombo",
        date: "2099-06-01",
        product_code: "p1",
      }),
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.quote.city).toBe("Colombo");
  });
});
