import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  trackOrder: vi.fn().mockResolvedValue({
    order_number: "VPAY827982BA",
    status: "Delivered",
    recipient: "Demo Customer",
    delivery_progress: [{ status: "Delivered", timestamp: "2026-06-24" }],
  }),
}));

import OrderTracker from "@/components/ui/OrderTracker";
import { trackOrder } from "@/lib/api";

describe("OrderTracker", () => {
  it("tracks using the demo-order shortcut", async () => {
    render(<OrderTracker />);

    fireEvent.click(screen.getByRole("button", { name: /use demo order/i }));

    await waitFor(() => {
      expect(trackOrder).toHaveBeenCalledWith("VPAY827982BA");
    });

    expect(screen.getAllByText("VPAY827982BA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Delivered").length).toBeGreaterThan(0);
    expect(screen.getByText(/Demo Customer/i)).toBeInTheDocument();
  });
});
