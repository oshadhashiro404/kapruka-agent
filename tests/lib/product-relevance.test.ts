import { describe, expect, it } from "vitest";
import { rankProductsByRelevance } from "@/lib/server/services/product-relevance";
import type { Product } from "@/lib/types";

function p(
  id: string,
  name: string,
  category: string,
  price = 5000
): Product {
  return {
    id,
    name,
    price_lkr: price,
    image_url: "https://www.kapruka.com/a.jpg",
    images: [],
    category,
    in_stock: true,
    url: "https://www.kapruka.com",
    is_perishable: category.toLowerCase().includes("flower"),
  };
}

describe("rankProductsByRelevance", () => {
  it("ranks roses bouquet above unrelated electronics for apology search", () => {
    const products = [
      p("1", "Samsung Galaxy Phone", "Electronics", 80000),
      p("2", "Red Roses Bouquet 12 stems", "Flowers", 4500),
      p("3", "Random Gift Item", "Gifts", 2000),
      p("4", "Flower Basket Premium", "Flowers", 6000),
    ];

    const ranked = rankProductsByRelevance(products, {
      query: "roses bouquet flowers apology",
      occasion: "apology",
      budgetLkr: 8000,
    });

    expect(ranked[0].name).toContain("Roses");
    expect(ranked.some((r) => r.name.includes("Samsung"))).toBe(false);
  });

  it("prefers birthday cake for birthday occasion", () => {
    const products = [
      p("1", "Office Laptop Bag", "Electronics", 12000),
      p("2", "Chocolate Birthday Cake 2lb", "Cakes", 3500),
      p("3", "Sympathy Flowers", "Flowers", 4000),
    ];

    const ranked = rankProductsByRelevance(products, {
      query: "birthday cake gift",
      occasion: "birthday",
    });

    expect(ranked[0].name.toLowerCase()).toContain("birthday");
  });

  it("filters out poor matches when enough good ones exist", () => {
    const products = [
      p("1", "Red Roses Deluxe Bouquet", "Flowers", 5000),
      p("2", "Rose Gold Watch", "Jewelry", 50000),
      p("3", "Fresh Rose Bouquet", "Flowers", 4500),
      p("4", "USB Cable Pack", "Electronics", 500),
    ];

    const ranked = rankProductsByRelevance(products, {
      query: "roses bouquet",
      occasion: "romantic",
    });

    expect(ranked.length).toBeLessThanOrEqual(8);
    expect(ranked.every((r) => !r.name.includes("USB"))).toBe(true);
  });
});
