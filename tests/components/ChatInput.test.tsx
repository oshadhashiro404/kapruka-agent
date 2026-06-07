import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatInput from "@/components/chat/ChatInput";

describe("ChatInput", () => {
  it("sends message on chip click", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} conversationState="empty" />);
    await user.click(screen.getByRole("button", { name: /flowers/i }));
    expect(onSend).toHaveBeenCalledWith("Show me flowers");
  });

  it("opens checkout for open checkout chip when cart has items", async () => {
    const { useCartStore } = await import("@/lib/cart-store");
    useCartStore.setState({
      items: [
        {
          product: {
            id: "p1",
            name: "Cake",
            price_lkr: 1000,
            image_url: "",
            images: [],
            category: "Cakes",
            in_stock: true,
            url: "https://www.kapruka.com",
            is_perishable: false,
          },
          quantity: 1,
          is_gift: false,
        },
      ],
    });
    const onOpenCheckout = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatInput
        onSend={vi.fn()}
        onOpenCheckout={onOpenCheckout}
        conversationState="delivery"
      />
    );
    await user.click(screen.getByRole("button", { name: /open checkout/i }));
    expect(onOpenCheckout).toHaveBeenCalled();
  });
});
