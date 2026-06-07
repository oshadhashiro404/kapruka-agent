import { describe, expect, it } from "vitest";
import { parseKaprukaOrderResult } from "@/lib/server/services/mcp";

describe("parseKaprukaOrderResult", () => {
  it("parses JSON object with order fields", () => {
    const result = parseKaprukaOrderResult({
      order_id: "ORD-12345",
      pay_url: "https://www.kapruka.com/pay/abc",
      total_lkr: 8500,
    });
    expect(result.order_id).toBe("ORD-12345");
    expect(result.pay_url).toContain("kapruka.com");
    expect(result.total_lkr).toBe(8500);
  });

  it("parses markdown order response", () => {
    const md = `
## Order Created
**Order ID**: \`ORD-999\`
**Pay URL**: https://www.kapruka.com/checkout/pay/xyz
**Total**: LKR 8,500
**Estimated Arrival**: Tomorrow morning
`;
    const result = parseKaprukaOrderResult(md);
    expect(result.order_id).toBe("ORD-999");
    expect(result.pay_url).toContain("checkout/pay");
    expect(result.total_lkr).toBe(8500);
  });

  it("parses markdown pay link in anchor format", () => {
    const md = `Order number: KAP123
[Pay now on Kapruka](https://www.kapruka.com/pay/link123)`;
    const result = parseKaprukaOrderResult(md);
    expect(result.order_id).toBeTruthy();
    expect(result.pay_url).toContain("pay/link123");
  });
});
