import { beforeEach, describe, expect, it } from "vitest";
import {
  cartItemCount,
  cartTotalLkr,
  findCartLine,
  useCartStore,
} from "@/lib/cart-store";
import type { Product } from "@/lib/types";

const sampleProduct = (id: string): Product => ({
  id,
  name: `Product ${id}`,
  price_lkr: 1000,
  image_url: "https://www.kapruka.com/x.jpg",
  images: [],
  category: "Gifts",
  in_stock: true,
  url: "https://www.kapruka.com",
  is_perishable: false,
});

describe("cart store helpers", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      deliveryCostLkr: 0,
      mode: "auto",
      activeCategory: "All",
    });
  });

  it("adds and increments quantity for same variant", () => {
    const p = sampleProduct("a");
    useCartStore.getState().addItem(p);
    useCartStore.getState().addItem(p);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("merges same product with same variant only", () => {
    const p = sampleProduct("a");
    useCartStore.getState().addItem(p, "red");
    useCartStore.getState().addItem(p, "blue");
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("removes item", () => {
    const p = sampleProduct("a");
    useCartStore.getState().addItem(p);
    useCartStore.getState().removeItem("a");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("clearCart resets delivery cost", () => {
    useCartStore.getState().addItem(sampleProduct("a"));
    useCartStore.getState().setDeliveryCost(500);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().deliveryCostLkr).toBe(0);
  });

  it("computes totals", () => {
    const items = [
      {
        product: sampleProduct("a"),
        quantity: 2,
        is_gift: false,
      },
    ];
    expect(cartTotalLkr(items)).toBe(2000);
    expect(cartItemCount(items)).toBe(2);
    expect(findCartLine(items, "a")).toBeDefined();
  });
});
