import type { EffectSettings } from "./types";

export type ResolvedEffectQuality = "low" | "medium" | "high";

function resolveAutoQuality(): ResolvedEffectQuality {
  if (typeof window === "undefined") return "high";

  const dpr = window.devicePixelRatio || 1;
  const px = window.innerWidth * window.innerHeight * dpr * dpr;

  const cores =
    typeof navigator !== "undefined"
      ? navigator.hardwareConcurrency
      : undefined;
  const mem =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;

  const isSmallScreen = window.innerWidth < 768;

  if (
    (typeof mem === "number" && mem <= 4) ||
    (typeof cores === "number" && cores <= 4)
  ) {
    return isSmallScreen ? "low" : "medium";
  }

  if (px > 2_500_000) return isSmallScreen ? "low" : "medium";

  return isSmallScreen ? "medium" : "high";
}

export function resolveEffectQuality(
  quality: EffectSettings["quality"],
): ResolvedEffectQuality {
  if (quality === "low" || quality === "medium" || quality === "high") {
    return quality;
  }
  return resolveAutoQuality();
}

export function resolveEffectCanvasDpr(
  quality: ResolvedEffectQuality,
): number | undefined {
  if (typeof window === "undefined") return undefined;

  const base = window.devicePixelRatio || 1;
  const cap = quality === "low" ? 1.0 : quality === "medium" ? 1.5 : 2.0;

  return Math.max(1, Math.min(base, cap));
}
