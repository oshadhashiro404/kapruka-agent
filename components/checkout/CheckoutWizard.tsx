"use client";

import { useState, useCallback } from "react";
import ProductImage from "@/components/ui/ProductImage";
import DeliveryCard from "@/components/delivery/DeliveryCard";
import PayButton from "@/components/checkout/PayButton";
import CityAutocomplete from "@/components/checkout/CityAutocomplete";
import AccessibleDialog from "@/components/ui/AccessibleDialog";
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
const STEP_LABELS = ["Cart", "Recipient", "Delivery", "Confirm"];

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: CheckoutStep }) {
  const current = STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-1 mb-5">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                i <= current ? "bg-primary" : "bg-white/10"
              }`}
            />
            <span
              className={`text-[10px] font-medium transition-colors ${
                i === current
                  ? "text-primary"
                  : i < current
                  ? "text-muted"
                  : "text-white/20"
              }`}
            >
              {STEP_LABELS[i]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  multiline,
  rows,
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const cls =
    `w-full rounded-2xl border px-4 py-3 text-sm bg-white/5 text-foreground placeholder:text-white/20 focus:outline-none transition-all duration-200 ` +
    (error
      ? "border-danger/60 focus:ring-2 focus:ring-danger/30"
      : "border-white/10 focus:ring-2 focus:ring-primary/40 focus:border-primary/50");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-muted">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 3}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={cls + " resize-none"}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={cls}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function CartLineItem({
  quantity,
  name,
  price,
  imageUrl,
  images,
  isGift,
  giftMessage,
  productId,
  variant,
  updateQuantity,
  removeItem,
}: {
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
  images?: string[];
  isGift?: boolean;
  giftMessage?: string;
  productId: string;
  variant?: string;
  updateQuantity: (id: string, qty: number, variant?: string) => void;
  removeItem: (id: string, variant?: string) => void;
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-white/5 last:border-0 items-center">
      <ProductImage
        name={name}
        imageUrl={imageUrl}
        images={images}
        className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10"
        imgClassName="object-contain p-0.5"
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-2 font-medium">
          {name}
          {isGift ? " 🎁" : ""}
        </p>
        {giftMessage && (
          <p className="text-xs text-muted line-clamp-1 mt-0.5 italic">
            "{giftMessage}"
          </p>
        )}
        <p className="text-xs text-primary font-semibold mt-0.5">
          {formatLKR(price)}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => {
            if (quantity <= 1) removeItem(productId, variant);
            else updateQuantity(productId, quantity - 1, variant);
          }}
          className="w-8 h-8 rounded-full border border-white/10 text-muted hover:border-danger/50 hover:text-danger flex items-center justify-center text-lg font-bold transition-all"
        >
          {quantity === 1 ? "×" : "−"}
        </button>
        <span className="text-sm font-bold text-foreground w-5 text-center">
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => updateQuantity(productId, quantity + 1, variant)}
          className="w-8 h-8 rounded-full border border-white/10 text-muted hover:border-primary/50 hover:text-primary flex items-center justify-center text-xl font-bold transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

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
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

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

  const fetchQuote = useCallback(async () => {
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
  }, [leadProductId, city, date, cityCode, setDeliveryCost]);

  const handleContinue = () => {
    const gate = canAdvanceFromStep(step, {
      itemCount: items.length,
      recipient: { name, phone, address },
      delivery: { city, date },
      hasQuote: step === "delivery" ? Boolean(quote) : true,
    });
    if (!gate.ok) {
      setError(gate.error);
      if (gate.field) setFieldErrors({ [gate.field]: gate.error });
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
      setError("Delivery isn't available for this date — go back and pick another day.");
      return;
    }
    if (orderPlaced) return;

    // Normalise Sri Lankan phone to 07XXXXXXXX
    const normPhone = phone.trim().replace(/\s+/g, "").replace(/^\+94/, "0").replace(/^94/, "0");

    const payload = {
      cart: items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        variant: i.selected_variant,
      })),
      recipient: { name: name.trim(), phone: normPhone },
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
      const result = await createOrder({ ...parsed.data });
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
      const raw = e instanceof Error ? e.message : "Could not create order";
      // Provide a helpful tip when Kapruka can't generate a payment link
      const isPayLinkIssue = raw.toLowerCase().includes("payment link") || raw.toLowerCase().includes("pay_url");
      setError(
        isPayLinkIssue
          ? `${raw}\n\nTip: Make sure your phone number is in 07X format and your address is complete, then try again.`
          : raw.length < 300
          ? raw
          : "Could not generate a payment link. Please verify all details and try again."
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
                className="px-5 py-2.5 rounded-2xl border border-white/10 text-sm text-muted hover:text-foreground hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                ← Back
              </button>
            )}
            {step !== "confirm" && (
              <button
                type="button"
                onClick={handleContinue}
                disabled={step === "cart" && items.length === 0}
                className="flex-1 py-2.5 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-[0.98] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                Continue →
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <StepIndicator step={step} />

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-danger/10 border border-danger/20 p-3.5 text-sm text-danger">
          <span className="text-base shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── CART STEP ──────────────────────────────────────────────── */}
      {step === "cart" && (
        <div>
          {items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-sm text-muted">
                Your cart is empty — add something from the chat first.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-0 mb-4">
                {items.map((item) => (
                  <CartLineItem
                    key={`${item.product.id}-${item.selected_variant}`}
                    quantity={item.quantity}
                    name={item.product.name}
                    price={item.product.price_lkr * item.quantity}
                    imageUrl={item.product.image_url}
                    images={item.product.images}
                    isGift={item.is_gift}
                    giftMessage={item.gift_message}
                    productId={item.product.id}
                    variant={item.selected_variant}
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="text-base font-bold text-foreground">
                  {formatLKR(totalLkr)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RECIPIENT STEP ─────────────────────────────────────────── */}
      {step === "recipient" && (
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Who&apos;s receiving this? We&apos;ll use these details for delivery.
          </p>
          <InputField
            id="recipient-name"
            label="Recipient name"
            value={name}
            onChange={setName}
            placeholder="Full name"
            error={fieldErrors.name}
            autoComplete="name"
          />
          <InputField
            id="recipient-phone"
            label="Phone number"
            value={phone}
            onChange={setPhone}
            type="tel"
            placeholder="07X XXX XXXX"
            error={fieldErrors.phone}
            autoComplete="tel"
            inputMode="tel"
          />
          <InputField
            id="recipient-address"
            label="Delivery address"
            value={address}
            onChange={setAddress}
            multiline
            rows={3}
            placeholder="House number, street, area…"
            error={fieldErrors.address}
            autoComplete="street-address"
          />
        </div>
      )}

      {/* ── DELIVERY STEP ──────────────────────────────────────────── */}
      {step === "delivery" && (
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            When and where should we deliver? Check availability before continuing.
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
          <InputField
            id="delivery-date"
            label="Delivery date"
            value={date}
            onChange={(v) => {
              setDate(v);
              setQuote(null);
            }}
            type="date"
            error={fieldErrors.date}
          />
          <button
            type="button"
            onClick={fetchQuote}
            disabled={quoteLoading || !city.trim() || !leadProductId}
            className="w-full py-3 rounded-2xl border border-primary/30 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 disabled:opacity-40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {quoteLoading ? "Checking…" : "✓ Check delivery availability"}
          </button>
          {quote && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <DeliveryCard quote={quote} />
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRM STEP ───────────────────────────────────────────── */}
      {step === "confirm" && (
        <div className="space-y-4">
          {quote ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <DeliveryCard quote={quote} />
            </div>
          ) : (
            <div className="rounded-2xl border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
              ⚠️ Go back and check delivery availability first.
            </div>
          )}

          {/* Order summary */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider px-4 pt-3 pb-2">
              Order summary
            </p>
            <div className="px-4 pb-3 space-y-0 divide-y divide-white/5">
              {items.map((item) => (
                <div
                  key={`confirm-${item.product.id}-${item.selected_variant}`}
                  className="flex gap-3 py-2.5 items-center"
                >
                  <ProductImage
                    name={item.product.name}
                    imageUrl={item.product.image_url}
                    images={item.product.images}
                    className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-white/5 border border-white/10"
                    imgClassName="object-contain p-0.5"
                    size="sm"
                  />
                  <p className="flex-1 text-sm text-foreground line-clamp-1">
                    {item.quantity}× {item.product.name}
                  </p>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {formatLKR(item.product.price_lkr * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recipient summary */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm space-y-1.5">
            <p>
              <span className="text-muted text-xs">To: </span>
              <span className="font-medium">{name}</span>
              <span className="text-muted"> · {phone}</span>
            </p>
            <p className="text-muted text-xs leading-relaxed">{address}</p>
            <div className="border-t border-white/5 pt-3 mt-2 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Items</span>
                <span>{formatLKR(totalLkr)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Delivery</span>
                <span>{formatDeliveryCost(deliveryCost)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-1.5 border-t border-white/5">
                <span>Total</span>
                <span className="text-primary">{formatLKR(deliveryTotal)}</span>
              </div>
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
              className="w-full py-4 rounded-2xl bg-success text-white font-bold text-base hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all focus:outline-none focus:ring-2 focus:ring-success/40 shadow-lg shadow-success/20"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating order…
                </span>
              ) : (
                "Place order & get payment link 🔒"
              )}
            </button>
          )}
        </div>
      )}
    </AccessibleDialog>
  );
}
