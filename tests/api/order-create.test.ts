import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/services/mcp", () => ({
  createOrder: vi.fn().mockResolvedValue({
    order_id: "ORD-1",
    pay_url: "https://pay.example",
    total_lkr: 5000,
    estimated_arrival: "Tomorrow",
  }),
}));

import { POST } from "@/app/api/order/create/route";
import { createOrder } from "@/lib/server/services/mcp";

describe("POST /api/order/create", () => {
  it("rejects invalid JSON", async () => {
    const res = await POST(new Request("http://localhost/api/order/create", {
      method: "POST",
      body: "not-json",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects missing required fields", async () => {
    const res = await POST(new Request("http://localhost/api/order/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart: [] }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns order payload on success", async () => {
    const res = await POST(new Request("http://localhost/api/order/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cart: [{ product_id: "p1", quantity: 1 }],
        recipient: { name: "Nimal", phone: "0771234567" },
        delivery: {
          address: "123 Road",
          city: "Colombo",
          date: "2099-06-01",
        },
      }),
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.order_id).toBe("ORD-1");
    expect(data.pay_url).toContain("https://");
  });

  it("surfaces Kapruka validation errors instead of generic payment-link error", async () => {
    vi.mocked(createOrder).mockRejectedValueOnce(
      new Error("Error (date_not_deliverable): We've scheduled your delivery for tomorrow")
    );

    const res = await POST(new Request("http://localhost/api/order/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cart: [{ product_id: "p1", quantity: 1 }],
        recipient: { name: "Nimal", phone: "0771234567" },
        delivery: {
          address: "123 Road",
          city: "Colombo",
          date: "2099-06-01",
        },
      }),
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/scheduled your delivery/i);
  });
});
