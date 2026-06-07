"use client";

import { useState } from "react";
import DeliveryCard from "@/components/delivery/DeliveryCard";
import PayButton from "@/components/checkout/PayButton";
import CityAutocomplete from "@/components/checkout/CityAutocomplete";
import AccessibleDialog from "@/components/ui/AccessibleDialog";
import { ErrorState } from "@/components/ui/LoadingState";
import { createOrder, quoteDelivery } from "@/lib/api";
import {
  canAdvanceFromStep,
  createOrderPayloadSchema,
  nextStep,
  prevStep,
  todayIso,
  type CheckoutStep,
} from "@/lib/checkout/checkout-schema";
import { useCartStore } from "@/lib/cart-store";
import type { DeliveryQuote, SessionContext } from "@/lib/types";
import { formatGiftMessageForOrder, formatLKR, selectLeadCartProduct } from "@/lib/utils";

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

const STEPS: CheckoutStep[] = ["cart", "recipient", "delivery", "confirm"];

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

  const [step, setStep] = useState<CheckoutStep>("cart");
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [payResult, setPayResult] = useState<{
    payUrl: string;
    orderId: string;
    expiresIn: number;
    total: number;
  } | null>(null);

  const leadProductId = selectLeadCartProduct(items);

  const fetchQuote = async () => {
    if (!leadProductId || !city.trim() || !date) return;
    setQuoteLoading(true);
    setError(null);
    setFieldErrors({});
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

  const handleContinue = () => {
    const gate = canAdvanceFromStep(step, {
      itemCount: items.length,
      recipient: { name, phone, address },
      delivery: { city, date },
      hasQuote: Boolean(quote),
    });
    if (!gate.ok) {
      setError(gate.error);
      if (gate.field) {
        setFieldErrors({ [gate.field]: gate.error });
      }
      return;
    }
    setError(null);
    setFieldErrors({});
    const n = nextStep(step);
    if (n) setStep(n);
  };

  const handleBack = () => {
    setError(null);
    setFieldErrors({});
    const p = prevStep(step);
    if (p) setStep(p);
  };

  const handlePlaceOrder = async () => {
    if (!quote?.deliverable) {
      setError("Delivery is not available for this date and city.");
      return;
    }
    if (orderPlaced) return;

    const payload = {
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
      gift_message: (() => {
        const giftItems = items.filter((i) => i.gift_message || i.gift_message_sinhala);
        if (!giftItems.length) return undefined;
        return giftItems
          .map((i) =>
            formatGiftMessageForOrder(i.gift_message, i.gift_message_sinhala)
          )
          .filter(Boolean)
          .join("\n\n");
      })(),
    };

    const parsed = createOrderPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first?.message ?? "Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createOrder({
        ...parsed.data,
      });
      setOrderPlaced(true);
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

  const deliveryTotal = (quote?.delivery_cost_lkr ?? 0) + totalLkr;

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      title="Checkout"
      subtitle="ගෙවීම"
      footer={
        !payResult ? (
          <div className="flex gap-2 px-4 py-4">
            {step !== "cart" && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                Back
              </button>
            )}
            {step !== "confirm" && (
              <button
                type="button"
                onClick={handleContinue}
                disabled={step === "cart" && items.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                Continue
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="flex gap-1 mb-4 -mt-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              step === s || STEPS.indexOf(step) > i
                ? "bg-primary"
                : "bg-border"
            }`}
            aria-hidden
          />
        ))}
      </div>

      {error && <ErrorState message={error} className="mb-3" />}

      {step === "cart" && (
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted">Your cart is empty.</p>
          ) : (
            <>
              {items.map((item) => (
                <div
                  key={`${item.product.id}-${item.selected_variant}`}
                  className="flex justify-between items-start text-sm py-2 border-b border-border gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground line-clamp-2 block">
                      {item.quantity}× {item.product.name}
                      {item.is_gift ? " 🎁" : ""}
                    </span>
                    {item.gift_message && (
                      <span className="text-xs text-muted line-clamp-1 block mt-0.5">
                        Card: {item.gift_message}
                      </span>
                    )}
                  </div>
                  <span className="text-primary font-medium shrink-0">
                    {formatLKR(item.product.price_lkr * item.quantity)}
                  </span>
                </div>
              ))}
            </>
          )}
          <p className="text-right font-bold text-foreground pt-2">
            Subtotal {formatLKR(totalLkr)}
          </p>
        </div>
      )}

      {step === "recipient" && (
        <div className="space-y-3">
          <div>
            <label htmlFor="recipient-name" className="block text-xs text-muted mb-1">
              Recipient name
            </label>
            <input
              id="recipient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {fieldErrors.name && (
              <p className="text-xs text-danger mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="recipient-phone" className="block text-xs text-muted mb-1">
              Phone
            </label>
            <input
              id="recipient-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {fieldErrors.phone && (
              <p className="text-xs text-danger mt-1">{fieldErrors.phone}</p>
            )}
          </div>
          <div>
            <label htmlFor="recipient-address" className="block text-xs text-muted mb-1">
              Delivery address
            </label>
            <textarea
              id="recipient-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              aria-invalid={Boolean(fieldErrors.address)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {fieldErrors.address && (
              <p className="text-xs text-danger mt-1">{fieldErrors.address}</p>
            )}
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
            <label htmlFor="delivery-date" className="block text-xs text-muted mb-1">
              Delivery date
            </label>
            <input
              id="delivery-date"
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={Boolean(fieldErrors.date)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {fieldErrors.date && (
              <p className="text-xs text-danger mt-1">{fieldErrors.date}</p>
            )}
          </div>
          <button
            type="button"
            onClick={fetchQuote}
            disabled={quoteLoading || !city.trim() || !leadProductId}
            className="w-full py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/10 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
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
          {items.some((i) => i.gift_message || i.gift_message_sinhala) && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm space-y-2">
              <p className="text-xs font-medium text-primary uppercase tracking-wide">
                Gift card messages
              </p>
              {items
                .filter((i) => i.gift_message || i.gift_message_sinhala)
                .map((i) => (
                  <div key={`${i.product.id}-${i.selected_variant}`}>
                    <p className="text-muted text-xs">{i.product.name}</p>
                    {i.gift_message && (
                      <p className="text-foreground">{i.gift_message}</p>
                    )}
                    {i.gift_message_sinhala && (
                      <p className="font-sinhala text-primary/90 text-sm">
                        {i.gift_message_sinhala}
                      </p>
                    )}
                  </div>
                ))}
            </div>
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
              disabled={submitting || !quote?.deliverable || orderPlaced}
              className="w-full py-3.5 rounded-xl bg-success text-bg font-bold hover:opacity-90 disabled:opacity-40 transition-opacity focus:outline-none focus:ring-2 focus:ring-success/40"
            >
              {submitting ? "Creating order…" : "Place order & get pay link"}
            </button>
          )}
        </div>
      )}
    </AccessibleDialog>
  );
}
