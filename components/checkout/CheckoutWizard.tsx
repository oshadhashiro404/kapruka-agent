"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
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
import {
  formatDeliveryCost,
  formatGiftMessageForOrder,
  formatLKR,
  selectLeadCartProduct,
} from "@/lib/utils";

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

function CheckoutLineItem({
  quantity,
  name,
  price,
  imageUrl,
  images,
  isGift,
  giftMessage,
}: {
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
  images?: string[];
  isGift?: boolean;
  giftMessage?: string;
}) {
  return (
    <div className="flex gap-3 py-2 border-b border-border last:border-0">
      <ProductImage
        name={name}
        imageUrl={imageUrl}
        images={images}
        className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-elevated border border-border"
        imgClassName="object-contain p-0.5"
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-2">
          {quantity}× {name}
          {isGift ? " 🎁" : ""}
        </p>
        {giftMessage && (
          <p className="text-xs text-muted line-clamp-1 mt-0.5">
            Card: {giftMessage}
          </p>
        )}
      </div>
      <span className="text-sm font-medium text-foreground shrink-0">
        {formatLKR(price)}
      </span>
    </div>
  );
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
  const deliveryCost = quote?.delivery_cost_lkr ?? 0;
  const deliveryTotal = deliveryCost + totalLkr;

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
      setError(
        e instanceof Error
          ? e.message
          : "Could not check delivery — try another city or date."
      );
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
      hasQuote: step === "delivery" ? Boolean(quote) : true,
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
      setError(
        "Delivery isn't available for this date — go back and pick another day."
      );
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
        const giftItems = items.filter(
          (i) => i.gift_message || i.gift_message_sinhala
        );
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
        total: result.total_lkr || deliveryTotal,
      });
      const summary = `Order ${result.order_id} — ${formatLKR(result.total_lkr || deliveryTotal)}`;
      onOrderComplete({
        payUrl: result.pay_url,
        orderId: result.order_id,
        expiresIn: result.expires_in,
        summary,
      });
      clearCart();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not create order";
      setError(
        msg.includes("payment link")
          ? msg
          : `${msg} — check your phone number and address, then try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

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
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Back
              </button>
            )}
            {step !== "confirm" && (
              <button
                type="button"
                onClick={handleContinue}
                disabled={step === "cart" && items.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        <div className="space-y-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">
              Your cart is empty — add something from chat first.
            </p>
          ) : (
            items.map((item) => (
              <CheckoutLineItem
                key={`${item.product.id}-${item.selected_variant}`}
                quantity={item.quantity}
                name={item.product.name}
                price={item.product.price_lkr * item.quantity}
                imageUrl={item.product.image_url}
                images={item.product.images}
                isGift={item.is_gift}
                giftMessage={item.gift_message}
              />
            ))
          )}
          <p className="text-right font-semibold text-foreground pt-3 text-sm">
            Subtotal {formatLKR(totalLkr)}
          </p>
        </div>
      )}

      {step === "recipient" && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Who&apos;s receiving this? We&apos;ll use these details for delivery.
          </p>
          <div>
            <label htmlFor="recipient-name" className="block text-xs text-muted mb-1">
              Recipient name
            </label>
            <input
              id="recipient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              placeholder="07XXXXXXXX"
              aria-invalid={Boolean(fieldErrors.phone)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              placeholder="House no, street, area"
              aria-invalid={Boolean(fieldErrors.address)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {fieldErrors.address && (
              <p className="text-xs text-danger mt-1">{fieldErrors.address}</p>
            )}
          </div>
        </div>
      )}

      {step === "delivery" && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            When and where should we deliver? Tap check delivery before continuing.
          </p>
          <CityAutocomplete
            value={city}
            cityCode={cityCode}
            onChange={(c, code) => {
              setCity(c);
              setCityCode(code);
              setQuote(null);
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
              onChange={(e) => {
                setDate(e.target.value);
                setQuote(null);
              }}
              aria-invalid={Boolean(fieldErrors.date)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {fieldErrors.date && (
              <p className="text-xs text-danger mt-1">{fieldErrors.date}</p>
            )}
          </div>
          <button
            type="button"
            onClick={fetchQuote}
            disabled={quoteLoading || !city.trim() || !leadProductId}
            className="w-full py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-elevated disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            <p className="text-sm text-muted">
              Go back to the delivery step and check delivery cost first.
            </p>
          )}

          <div className="rounded-xl bg-surface border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Order summary
            </p>
            {items.map((item) => (
              <CheckoutLineItem
                key={`confirm-${item.product.id}-${item.selected_variant}`}
                quantity={item.quantity}
                name={item.product.name}
                price={item.product.price_lkr * item.quantity}
                imageUrl={item.product.image_url}
                images={item.product.images}
              />
            ))}
          </div>

          {items.some((i) => i.gift_message || i.gift_message_sinhala) && (
            <div className="rounded-xl bg-surface border border-border p-3 text-sm space-y-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                Gift card messages
              </p>
              {items
                .filter((i) => i.gift_message || i.gift_message_sinhala)
                .map((i) => (
                  <div key={`${i.product.id}-${i.selected_variant}`}>
                    <p className="text-muted text-xs line-clamp-1">{i.product.name}</p>
                    {i.gift_message && (
                      <p className="text-foreground text-sm">{i.gift_message}</p>
                    )}
                    {i.gift_message_sinhala && (
                      <p className="font-sinhala text-muted text-sm">
                        {i.gift_message_sinhala}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}

          <div className="rounded-xl bg-elevated border border-border p-3 text-sm space-y-1.5">
            <p>
              <span className="text-muted">To:</span> {name} · {phone}
            </p>
            <p>
              <span className="text-muted">Address:</span> {address}
            </p>
            <div className="pt-2 border-t border-border space-y-1">
              <p className="flex justify-between">
                <span className="text-muted">Items</span>
                <span>{formatLKR(totalLkr)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span>{formatDeliveryCost(deliveryCost)}</span>
              </p>
              <p className="flex justify-between font-semibold text-foreground pt-1">
                <span>Total</span>
                <span>{formatLKR(deliveryTotal)}</span>
              </p>
            </div>
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
              className="w-full py-3.5 rounded-xl bg-success text-white font-bold hover:opacity-90 disabled:opacity-40 transition-opacity focus:outline-none focus:ring-2 focus:ring-success/40"
            >
              {submitting ? "Creating your order…" : "Place order & get pay link"}
            </button>
          )}
        </div>
      )}
    </AccessibleDialog>
  );
}
