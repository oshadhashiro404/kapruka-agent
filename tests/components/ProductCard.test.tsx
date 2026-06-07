import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "p1",
  name: "Rose Bouquet",
  price_lkr: 3500,
  image_url: "",
  images: [],
  category: "Flowers",
  in_stock: false,
  url: "https://www.kapruka.com/rose",
  is_perishable: true,
};

describe("ProductCard", () => {
  it("disables add when out of stock", () => {
    render(<ProductCard product={product} onView={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("calls onAdd when in stock", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <ProductCard
        product={{ ...product, in_stock: true }}
        onView={vi.fn()}
        onAdd={onAdd}
      />
    );
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalled();
  });
});
