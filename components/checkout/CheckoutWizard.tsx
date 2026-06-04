"use client";

import { useState } from "react";
import DeliveryCard from "@/components/delivery/DeliveryCard";
import PayButton from "@/components/checkout/PayButton";
import CityAutocomplete from "@/components/checkout/CityAutocomplete";
import { createOrder, quoteDelivery } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import type { DeliveryQuote, SessionContext } from "@/lib/types";
import { formatLKR } from "@/lib/utils";

type Step = "cart" | "recipient" | "delivery" | "confirm";

interface CheckoutWizardProps {
  open: boolean;
  onClose: () => void;
  sessionContext?: SessionContext;
  onOrderComplete: (params: {
    payUrl: string;
    orderId: string;
    expiresIn: number;
    summary: string;
  }) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckoutWizard({
  open,
  onClose,
  sessionContext,
  onOrderComplete,
}: CheckoutWizardProps) {
  const items = useCartStore((s) => s.items);
  const totalLkr = useCartStore((s) => s.totalLkr());
  const setDeliveryCost = useCartStore((s) => s.setDeliveryCost);
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep] = useState<Step>("cart");
  const [name, setName] = useState(sessionContext?.recipientName ?? "");
  const [phone, setPhone] = useState(sessionContext?.recipientPhone ?? "");
  const [address, setAddress] = useState(sessionContext?.recipientAddress ?? "");
  const [city, setCity] = useState(sessionContext?.deliveryCity ?? "");
  const [cityCode, setCityCode] = useState(sessionContext?.deliveryCityCode ?? "");
  const [date, setDate] = useState(sessionContext?.pendingDeliveryDate ?? todayIso());
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payResult, setPayResult] = useState<{
    payUrl: string;
    orderId: string;
    expiresIn: number;
    total: number;
  } | null>(null);

  const leadProductId = items[0]?.product.id ?? "";

  const fetchQuote = async () => {
    if (!leadProductId || !city.trim() || !date) return;
    setQuoteLoading(true);
    setError(null);
    try {
      const q = await quoteDelivery(city, date, leadProductId);
      setQuote(q);
      setDeliveryCost(q.delivery_cost_lkr);
      setCityCode(q.city_code || cityCode);
      setCity(q.city);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check delivery");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!quote?.deliverable) {
      setError("Delivery is not available for this date and city.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const giftItem = items.find((i) => i.gift_message);
      const result = await createOrder({
        cart: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          variant: i.selected_variant,
        })),
        recipient: { name: name.trim(), phone: phone.trim() },
        delivery: {
          address: address.trim(),
          city: cityCode || city.trim(),
          date,
        },
        gift_message: giftItem?.gift_message,
      });
      setPayResult({
        payUrl: result.pay_url,
        orderId: result.order_id,
        expiresIn: result.expires_in,
        total: result.total_lkr,
      });
      const summary = `Order ${result.order_id} — ${formatLKR(result.total_lkr)}`;
      onOrderComplete({
        payUrl: result.pay_url,
        orderId: result.order_id,
        expiresIn: result.expires_in,
        summary,
      });
      clearCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const deliveryTotal = (quote?.delivery_cost_lkr ?? 0) + totalLkr;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[60]"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[70] w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-surface border border-border shadow-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">Checkout</h2>
            <p className="font-sinhala text-xs text-muted">ගෙවීම</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-muted hover:text-foreground hover:bg-elevated text-xl"
            aria-label="Close checkout"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 px-4 py-2 shrink-0">
          {(["cart", "recipient", "delivery", "confirm"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                step === s || (["cart", "recipient", "delivery", "confirm"].indexOf(step) > i)
                  ? "bg-primary"
                  : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {error && (
            <p className="text-sm text-danger mb-3 rounded-lg bg-danger/10 px-3 py-2">
              {error}
            </p>
          )}

          {step === "cart" && (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={`${item.product.id}-${item.selected_variant}`}
                  className="flex justify-between text-sm py-2 border-b border-border"
                >
                  <span className="text-foreground line-clamp-1 flex-1 pr-2">
                    {item.quantity}× {item.product.name}
                  </span>
                  <span className="text-primary font-medium shrink-0">
                    {formatLKR(item.product.price_lkr * item.quantity)}
                  </span>
                </div>
              ))}
              <p className="text-right font-bold text-foreground pt-2">
                Subtotal {formatLKR(totalLkr)}
              </p>
            </div>
          )}

          {step === "recipient" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-1">Recipient name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Delivery address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          )}

          {step === "delivery" && (
            <div className="space-y-3">
              <CityAutocomplete
                value={city}
                cityCode={cityCode}
                onChange={(c, code) => {
                  setCity(c);
                  setCityCode(code);
                }}
              />
              <div>
                <label className="block text-xs text-muted mb-1">Delivery date</label>
                <input
                  type="date"
                  value={date}
                  min={todayIso()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                type="button"
                onClick={fetchQuote}
                disabled={quoteLoading || !city.trim() || !leadProductId}
                className="w-full py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/10 disabled:opacity-40 transition-colors"
              >
                {quoteLoading ? "Checking delivery…" : "Check delivery cost"}
              </button>
              {quote && <DeliveryCard quote={quote} />}
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-3">
              {quote ? (
                <DeliveryCard quote={quote} />
              ) : (
                <p className="text-sm text-muted">Check delivery in the previous step.</p>
              )}
              <div className="rounded-xl bg-elevated border border-border p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted">To:</span> {name} · {phone}
                </p>
                <p>
                  <span className="text-muted">Address:</span> {address}
                </p>
                <p className="font-bold text-primary pt-2">
                  Total {formatLKR(deliveryTotal)}
                </p>
              </div>
              {payResult ? (
                <PayButton
                  payUrl={payResult.payUrl}
                  orderId={payResult.orderId}
                  expiresIn={payResult.expiresIn}
                  totalLkr={payResult.total}
                />
              ) : (
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submitting || !quote?.deliverable}
                  className="w-full py-3.5 rounded-xl bg-success text-bg font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {submitting ? "Creating order…" : "Place order & get pay link"}
                </button>
              )}
            </div>
          )}
        </div>

        {!payResult && (
          <div className="shrink-0 flex gap-2 px-4 py-4 border-t border-border">
            {step !== "cart" && (
              <button
                type="button"
                onClick={() => {
                  const order: Step[] = ["cart", "recipient", "delivery", "confirm"];
                  const idx = order.indexOf(step);
                  if (idx > 0) setStep(order[idx - 1]);
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground"
              >
                Back
              </button>
            )}
            {step !== "confirm" && (
              <button
                type="button"
                onClick={() => {
                  if (step === "cart" && items.length === 0) return;
                  if (step === "recipient" && (!name.trim() || !phone.trim() || !address.trim())) {
                    setError("Please fill recipient details.");
                    return;
                  }
                  if (step === "delivery" && !quote) {
                    setError("Please check delivery first.");
                    return;
                  }
                  setError(null);
                  const order: Step[] = ["cart", "recipient", "delivery", "confirm"];
                  const idx = order.indexOf(step);
                  if (idx < order.length - 1) setStep(order[idx + 1]);
                }}
                disabled={step === "cart" && items.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-40"
              >
                Continue
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
