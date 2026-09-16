"use client";

import Image from "next/image";

interface BrandLogoProps {
  /**
   * "full" renders the wide logo with emblem and "agaate" wordmark.
   * "mark" renders the isolated circular sunrise + field emblem.
   */
  variant?: "full" | "mark";
  height?: number;
  width?: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  variant = "full",
  height = 32,
  width,
  className = "",
  priority = false,
}: BrandLogoProps) {
  // Full logo aspect ratio is 3100 / 797 ~= 3.889
  // Mark logo aspect ratio is 1:1
  const calculatedWidth = width ?? (variant === "mark" ? height : Math.round(height * 3.889));

  if (variant === "mark") {
    return (
      <span className={`brand-mark-wrap ${className}`} style={{ display: "inline-flex", alignItems: "center", lineHeight: 1 }}>
        <Image
          src="/logo-mark.png"
          alt="Agaate Precision Agriculture"
          width={calculatedWidth}
          height={height}
          priority={priority}
          style={{ height: `${height}px`, width: "auto", objectFit: "contain" }}
        />
      </span>
    );
  }

  return (
    <span className={`brand-logo-wrap ${className}`} style={{ display: "inline-flex", alignItems: "center", lineHeight: 1 }}>
      <Image
        src="/logo.png"
        alt="Agaate Precision Agriculture"
        width={calculatedWidth}
        height={height}
        priority={priority}
        className="brand-logo-img brand-logo-light"
        style={{ height: `${height}px`, width: "auto", objectFit: "contain" }}
      />
      <Image
        src="/logo-dark.png"
        alt="Agaate Precision Agriculture"
        width={calculatedWidth}
        height={height}
        priority={priority}
        className="brand-logo-img brand-logo-dark"
        style={{ height: `${height}px`, width: "auto", objectFit: "contain" }}
      />
    </span>
  );
}
