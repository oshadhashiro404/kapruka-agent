import { describe, expect, it } from "vitest";
import {
  formatCartSummary,
  matchProductByName,
  resolveAddProducts,
  wantsCartSummary,
} from "@/lib/chat-intents";
import type { Product } from "@/lib/types";

const products: Product[] = [
  {
    id: "1",
    name: "Red Roses Bouquet",
    price_lkr: 5000,
    image_url: "",
    images: [],
    category: "Flowers",
    in_stock: true,
    url: "https://www.kapruka.com",
    is_perishable: true,
  },
  {
    id: "2",
    name: "Chocolate Gift Box",
    price_lkr: 3000,
    image_url: "",
    images: [],
    category: "Gifts",
    in_stock: true,
    url: "https://www.kapruka.com",
    is_perishable: false,
  },
];

describe("resolveAddProducts", () => {
  it("adds first product", () => {
    const result = resolveAddProducts("add the first one", products);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("adds second product", () => {
    const result = resolveAddProducts("add the second one", products);
    expect(result[0].id).toBe("2");
  });

  it("adds both products", () => {
    const result = resolveAddProducts("add both to cart", products);
    expect(result).toHaveLength(2);
  });

  it("matches by name", () => {
    const result = resolveAddProducts("add the chocolate", products);
    expect(result[0].name).toContain("Chocolate");
  });
});

describe("matchProductByName", () => {
  it("finds roses by partial name", () => {
    expect(matchProductByName("add roses bouquet", products)?.id).toBe("1");
  });
});

describe("wantsCartSummary", () => {
  it("detects cart summary request", () => {
    expect(wantsCartSummary("what's in my cart?")).toBe(true);
  });
});

describe("formatCartSummary", () => {
  it("formats empty cart", () => {
    expect(formatCartSummary([])).toContain("empty");
  });
});
