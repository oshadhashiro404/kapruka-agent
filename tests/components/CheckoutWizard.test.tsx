import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CheckoutWizard from "@/components/checkout/CheckoutWizard";
import { useCartStore } from "@/lib/cart-store";

describe("CheckoutWizard", () => {
  it("blocks continue with empty cart", () => {
    useCartStore.setState({ items: [], deliveryCostLkr: 0 });
    render(
      <CheckoutWizard
        open
        onClose={vi.fn()}
        onOrderComplete={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
