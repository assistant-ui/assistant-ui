"use client";

import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type VisualTone = "iris" | "dawn" | "mint" | "sand";

// Each tone is a few soft color fields over the page color. The colors are
// half see-through, so they read as pastels on the light page and as deep
// tints on the dark one without a second set of values.
const field = (at: string, hue: number, chroma = 0.14, alpha = 0.55) =>
  `radial-gradient(70% 90% at ${at}, oklch(0.74 ${chroma} ${hue} / ${alpha}), transparent 72%)`;

const TONES: Record<VisualTone, string> = {
  iris: [
    field("12% 18%", 285),
    field("88% 22%", 235),
    field("70% 100%", 340, 0.12, 0.45),
    field("20% 100%", 255, 0.1, 0.4),
  ].join(","),
  dawn: [
    field("10% 15%", 55),
    field("90% 20%", 95, 0.13),
    field("75% 100%", 15, 0.13, 0.5),
    field("15% 100%", 330, 0.1, 0.35),
  ].join(","),
  mint: [
    field("12% 20%", 190),
    field("85% 15%", 150, 0.13),
    field("80% 100%", 235, 0.12, 0.45),
    field("15% 100%", 165, 0.1, 0.4),
  ].join(","),
  sand: "",
};

/** One color family around `hue`: its neighbors on the wheel, so the panel reads as a single color. */
const family = (hue: number) =>
  [
    field("12% 18%", hue),
    field("88% 22%", hue + 28),
    field("70% 100%", hue - 24, 0.12, 0.45),
    field("20% 100%", hue + 12, 0.1, 0.4),
  ].join(",");

const VisualHueContext = createContext<number | null>(null);

/** Gives every backdrop inside it one color family, by its hue, whatever tone each asks for. */
export const VisualHue = VisualHueContext.Provider;

/** The soft colored panel a library visual sits on; `sand` is the site's own tint with no color. */
export function VisualBackdrop({
  tone,
  className,
  children,
}: {
  tone: VisualTone;
  className?: string;
  children?: ReactNode;
}) {
  const hue = useContext(VisualHueContext);
  const image = hue !== null && tone !== "sand" ? family(hue) : TONES[tone];
  const style: CSSProperties | undefined = image
    ? { backgroundImage: image }
    : undefined;
  return (
    <div
      style={style}
      className={cn(
        "relative isolate overflow-hidden rounded-(--library-card)",
        tone === "sand"
          ? "bg-foreground/[0.03] dark:bg-foreground/[0.045]"
          : "bg-background",
        className,
      )}
    >
      {tone === "sand" ? null : (
        <>
          <span
            aria-hidden
            className="bg-background/60 dark:bg-background/20 absolute -top-1/3 left-1/4 -z-10 h-[140%] w-1/3 rotate-[28deg] rounded-full blur-3xl"
          />
          <span
            aria-hidden
            className="bg-background/40 dark:bg-background/10 absolute -bottom-1/2 left-2/3 -z-10 h-full w-1/4 rotate-[28deg] rounded-full blur-2xl"
          />
        </>
      )}
      {children}
    </div>
  );
}

/** The lift of an object floating on a backdrop; the site zeroes the stock shadows. */
export const visualLift =
  "ring-foreground/[0.06] shadow-[0_1px_2px_oklch(0_0_0/5%),0_10px_30px_-10px_oklch(0_0_0/18%)] ring-1 dark:shadow-[0_1px_2px_oklch(0_0_0/30%),0_10px_30px_-10px_oklch(0_0_0/60%)]";
