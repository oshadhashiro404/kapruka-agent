"use client";

interface CheckoutPanelProps {
  onCheckout: () => void;
}

export default function CheckoutPanel({ onCheckout }: CheckoutPanelProps) {
  return (
    <button
      type="button"
      onClick={onCheckout}
      className="w-full py-3 rounded-xl border border-border text-muted font-medium hover:text-foreground hover:border-primary/40 transition-colors"
    >
      Checkout via chat / කතාවෙන් ගෙවන්න
    </button>
  );
}
