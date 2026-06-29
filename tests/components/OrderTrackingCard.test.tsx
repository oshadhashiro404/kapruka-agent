import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OrderTrackingCard from "@/components/orders/OrderTrackingCard";

describe("OrderTrackingCard", () => {
  it("renders status, recipient, and timeline", () => {
    render(
      <OrderTrackingCard
        tracking={{
          order_number: "VPAY827982BA",
          status: "Out for delivery",
          recipient: "Nimal Perera",
          delivery_progress: [
            { status: "Order placed", timestamp: "2026-06-20" },
            { status: "Out for delivery", timestamp: "2026-06-21" },
          ],
        }}
      />
    );
    expect(screen.getByText("VPAY827982BA")).toBeInTheDocument();
    expect(screen.getAllByText("Out for delivery").length).toBeGreaterThan(0);
    expect(screen.getByText(/Nimal Perera/)).toBeInTheDocument();
    expect(screen.getByText("Order placed")).toBeInTheDocument();
  });
});
