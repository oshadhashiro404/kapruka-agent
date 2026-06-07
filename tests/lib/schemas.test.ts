import { describe, expect, it } from "vitest";
import { cartItemSchema } from "@/lib/schemas";
import {
  deliveryFormSchema,
  recipientFormSchema,
} from "@/lib/checkout/checkout-schema";

const baseProduct = {
  id: "p1",
  name: "Cake",
  price_lkr: 2500,
  image_url: "https://www.kapruka.com/img.jpg",
  images: [],
  category: "Cakes",
  in_stock: true,
  url: "https://www.kapruka.com/cake",
  is_perishable: true,
};

describe("recipientFormSchema", () => {
  it("accepts valid recipient data", () => {
    const result = recipientFormSchema.safeParse({
      name: "Nimal Perera",
      phone: "0771234567",
      address: "123 Galle Road, Colombo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty recipient name", () => {
    const result = recipientFormSchema.safeParse({
      name: "",
      phone: "0771234567",
      address: "123 Galle Road, Colombo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone", () => {
    const result = recipientFormSchema.safeParse({
      name: "Nimal",
      phone: "abc",
      address: "123 Galle Road, Colombo",
    });
    expect(result.success).toBe(false);
  });
});

describe("deliveryFormSchema", () => {
  it("rejects missing city", () => {
    const result = deliveryFormSchema.safeParse({
      city: "",
      date: "2099-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects past dates", () => {
    const result = deliveryFormSchema.safeParse({
      city: "Colombo",
      date: "2000-01-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("cartItemSchema", () => {
  it("accepts valid cart item", () => {
    const result = cartItemSchema.safeParse({
      product: baseProduct,
      quantity: 1,
      is_gift: false,
    });
    expect(result.success).toBe(true);
  });
});
