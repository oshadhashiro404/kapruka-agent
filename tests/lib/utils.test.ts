import { describe, expect, it } from "vitest";
import { dedupeProducts, mergeProductUpdates } from "@/lib/utils";
import { toUserFriendlyError } from "@/lib/errors";

const product = (id: string, name = "Item") => ({
  id,
  name,
  price_lkr: 1000,
  image_url: "https://www.kapruka.com/a.jpg",
  images: [],
  category: "Gifts",
  in_stock: true,
  url: "https://www.kapruka.com",
  is_perishable: false,
});

describe("dedupeProducts", () => {
  it("merges duplicate ids", () => {
    const merged = dedupeProducts([
      product("1", "A"),
      product("1", "A updated"),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("A updated");
  });
});

describe("mergeProductUpdates", () => {
  it("does not duplicate items on append", () => {
    const result = mergeProductUpdates([product("1")], [product("2")]);
    expect(result).toHaveLength(2);
  });
});

describe("toUserFriendlyError", () => {
  it("hides tool_use_failed blobs", () => {
    expect(toUserFriendlyError("tool_use_failed: something")).toContain(
      "Oops, something went wrong"
    );
  });
});
