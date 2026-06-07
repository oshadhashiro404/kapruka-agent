import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RecommendationCard from "@/components/products/RecommendationCard";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "p1",
  name: "ProBuds T6",
  price_lkr: 4500,
  image_url: "",
  images: [],
  category: "Electronics",
  in_stock: true,
  url: "https://www.kapruka.com/probuds",
  is_perishable: false,
};

describe("RecommendationCard", () => {
  it("renders product name and category", () => {
    render(
      <RecommendationCard product={product} onView={vi.fn()} onAdd={vi.fn()} />
    );
    expect(screen.getByText("ProBuds T6")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("uses fallback category label when empty", () => {
    render(
      <RecommendationCard
        product={{ ...product, category: "" }}
        onView={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.getByText("Shop")).toBeInTheDocument();
  });

  it("calls onAdd when add is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <RecommendationCard product={product} onView={vi.fn()} onAdd={onAdd} />
    );
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalledWith(product);
  });
});
