"use client";

import { useEffect, useRef, useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import type { Product } from "@/lib/types";
import { formatLKR, hasVariants } from "@/lib/utils";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product) => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ProductModal({
  product,
  onClose,
  onAdd,
}: ProductModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [enriched, setEnriched] = useState<Product | null>(null);

  useEffect(() => {
    if (!product) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ].filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [product, onClose]);

  useEffect(() => {
    if (!product) {
      setEnriched(null);
      return;
    }
    const hasImages =
      product.image_url?.startsWith("http") ||
      (product.images?.length ?? 0) > 0;
    if (hasImages) {
      setEnriched(product);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { getApiBase } = await import("@/lib/api-base");
        const res = await fetch(`${getApiBase()}/api/product`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: product.id }),
        });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { product: Product };
          setEnriched(data.product);
        } else if (!cancelled) {
          setEnriched(product);
        }
      } catch {
        if (!cancelled) setEnriched(product);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!product) return null;

  const display = enriched ?? product;
  const images = [
    ...(display.images ?? []),
    ...(display.image_url && !display.images?.includes(display.image_url)
      ? [display.image_url]
      : []),
  ].filter((s) => s?.startsWith("http"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="product-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-t-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 flex justify-between items-center px-4 py-3 bg-surface/95 backdrop-blur-sm border-b border-border z-10">
          <span className="text-xs text-muted font-medium uppercase tracking-widest">
            Product Details
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-elevated text-foreground text-lg flex items-center justify-center hover:bg-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Close product details"
          >
            ×
          </button>
        </div>

        {images.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 scrollbar-hide">
            {images.map((src, i) => (
              <ProductImage
                key={src + i}
                name={`${display.name} ${i + 1}`}
                imageUrl={src}
                className="relative w-64 h-64 shrink-0 rounded-xl overflow-hidden bg-elevated"
              />
            ))}
          </div>
        ) : (
          <div className="mx-4 mt-4 rounded-xl bg-gradient-to-br from-primary/10 to-surface h-40 flex items-center justify-center border border-border">
            <div className="text-center">
              <span className="text-5xl">📦</span>
              <p className="text-xs text-muted mt-2">No image available</p>
            </div>
          </div>
        )}

        <div className="px-5 pb-6 pt-4">
          <h2 id="product-modal-title" className="text-xl font-bold text-foreground leading-snug">
            {product.name}
          </h2>
          <p className="text-2xl font-bold text-primary mt-1">
            {product.price_lkr > 0 ? formatLKR(product.price_lkr) : "Price unavailable"}
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                product.in_stock
                  ? "bg-success/15 text-success"
                  : "bg-danger/15 text-danger"
              }`}
            >
              {product.in_stock ? "✓ In stock" : "✗ Out of stock"}
            </span>
            {product.is_perishable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium">
                🕐 Perishable
              </span>
            )}
            {product.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-elevated text-muted">
                {product.category}
              </span>
            )}
          </div>

          {product.is_perishable && (
            <p className="text-sm text-warning/80 mt-3 bg-warning/10 rounded-lg p-3">
              ⚠️ This is a perishable item — delivery date selection matters.
            </p>
          )}

          {hasVariants(product) && (
            <div className="mt-3 space-y-1 text-sm text-muted">
              {product.variants?.sizes && (
                <p>
                  <span className="text-foreground">Sizes:</span>{" "}
                  {product.variants.sizes.join(", ")}
                </p>
              )}
              {product.variants?.colors && (
                <p>
                  <span className="text-foreground">Colors:</span>{" "}
                  {product.variants.colors.join(", ")}
                </p>
              )}
              {product.variants?.flavors && (
                <p>
                  <span className="text-foreground">Flavors:</span>{" "}
                  {product.variants.flavors.join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-accent font-medium text-center hover:bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              View on Kapruka ↗
            </a>
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={!product.in_stock}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-40 hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
