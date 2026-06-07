"use client";

import { useEffect, useState } from "react";
import { productImageSrc } from "@/lib/utils";

interface ProductImageProps {
  name: string;
  imageUrl?: string;
  images?: string[];
  inStock?: boolean;
  className?: string;
  imgClassName?: string;
  size?: "sm" | "md" | "lg";
  showRetry?: boolean;
}

function Placeholder({ name, className }: { name: string; className?: string }) {
  const letter = name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-surface ${className ?? ""}`}
    >
      <span className="text-2xl font-bold text-primary/60">{letter}</span>
    </div>
  );
}

export default function ProductImage({
  name,
  imageUrl,
  images,
  inStock = true,
  className = "",
  imgClassName = "",
  showRetry = true,
}: ProductImageProps) {
  const rawSrc = productImageSrc(imageUrl || images?.[0] || "");
  const hasImage = rawSrc.length > 0;
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!hasImage || imgState !== "loading") return;
    const t = setTimeout(() => setImgState("error"), 15_000);
    return () => clearTimeout(t);
  }, [hasImage, imgState]);

  const imgSrc =
    retry > 0
      ? `${rawSrc}${rawSrc.includes("?") ? "&" : "?"}r=${retry}`
      : rawSrc;

  if (!hasImage || imgState === "error") {
    return <Placeholder name={name} className={className} />;
  }

  return (
    <div key={rawSrc} className={`relative overflow-hidden ${className}`}>
      {imgState === "loading" && (
        <div className="absolute inset-0 bg-border animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${rawSrc}-${retry}`}
        src={imgSrc}
        alt={name}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          imgState === "loaded" ? "opacity-100" : "opacity-0"
        } ${!inStock ? "grayscale opacity-50" : ""} ${imgClassName}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setImgState("loaded")}
        onError={() => {
          if (showRetry && retry < 1) {
            setRetry((r) => r + 1);
            setImgState("loading");
          } else {
            setImgState("error");
          }
        }}
      />
    </div>
  );
}
