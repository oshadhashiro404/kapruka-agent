import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MessageBubble from "@/components/chat/MessageBubble";

describe("MessageBubble", () => {
  it("renders delivery quote section", () => {
    render(
      <MessageBubble
        message={{
          id: "m1",
          role: "assistant",
          content: "Delivery looks good.",
          delivery_quote: {
            deliverable: true,
            city: "Colombo",
            city_code: "CMB",
            delivery_date: "2099-06-01",
            delivery_cost_lkr: 500,
            estimated_arrival: "Next day",
            is_perishable: false,
          },
          timestamp: new Date(),
        }}
        onView={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.getByText(/colombo/i)).toBeInTheDocument();
  });
});
