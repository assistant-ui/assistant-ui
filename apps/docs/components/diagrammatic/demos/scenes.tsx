import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Publication skins for examples: each wraps a chart in the chrome of the
 * world it came from and reskins the palette through --dg tokens. Scenes pin
 * their own colors on purpose — a newspaper stays paper-white in dark mode,
 * a terminal stays dark in light mode — so every figure reads as a real
 * artifact, and doubles as a live demo of token theming.
 */

export function Report({
  title,
  chip,
  note,
  children,
}: {
  title: string;
  chip?: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full border border-[#e2e1dd] bg-[#f7f6f3] px-6 pt-5 pb-4 text-[#1c1c1a] [--dg-c1:#e07a52] [--dg-c2:#55b5a6] [--dg-c3:#4a7de0] [--dg-c4:#54555a] [--dg-c5:#7c5cdb] [--dg-c6:#4a9d7c] [--dg-c7:#d9a13b] [--dg-surface:#f7f6f3]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[14px] font-semibold tracking-tight">{title}</p>
        {chip ? (
          <span className="bg-[#1c1c1a] px-2.5 py-1 text-[11px] font-medium text-[#f7f6f3]">
            {chip}
          </span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
      {note ? (
        <p className="mt-3 border-t border-[#e2e1dd] pt-2.5 text-[11px] leading-relaxed text-[#77766f]">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function Terminal({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full border border-[#1d2b26] bg-[#0b120f] px-5 pt-3.5 pb-4 font-[family-name:var(--font-mono)] text-[#c8d6cd] [--dg-c1:#34d399] [--dg-c2:#fbbf24] [--dg-c3:#38bdf8] [--dg-c4:#fb7185] [--dg-c5:#a78bfa] [--dg-c6:#2dd4bf] [--dg-c7:#fb923c] [--dg-pos:#34d399] [--dg-surface:#0b120f]">
      <div className="flex items-center gap-2 text-[10.5px] text-[#5d6f66]">
        <span className="size-1.5 rounded-full bg-[#34d399]" />
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function Paper({
  kicker,
  title,
  source,
  children,
}: {
  kicker?: string;
  title: string;
  source?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full border border-[#e6e0d4] bg-[#fbf8f1] px-6 pt-5 pb-4 text-[#191713] [--dg-c1:#274c77] [--dg-c2:#a63d40] [--dg-c3:#6b8f3d] [--dg-c4:#8a8577] [--dg-c5:#b07d2b] [--dg-c6:#56687a] [--dg-c7:#7d4a66] [--dg-neg:#a63d40] [--dg-surface:#fbf8f1]">
      {kicker ? (
        <p className="text-[10px] font-medium tracking-[0.16em] text-[#a63d40] uppercase">
          {kicker}
        </p>
      ) : null}
      <p
        className={cn(
          "font-[family-name:var(--font-atlas)] text-[21px] leading-tight",
          kicker && "mt-1.5",
        )}
      >
        {title}
      </p>
      <div className="mt-4 border-t border-[#191713] pt-4">{children}</div>
      {source ? (
        <p className="mt-3 text-[10.5px] text-[#9a9384]">{source}</p>
      ) : null}
    </div>
  );
}

export function AppCard({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full rounded-xl border border-[#e7e8ec] bg-white p-5 text-[#1f2330] shadow-[0_1px_2px_rgba(18,20,40,0.05),0_12px_32px_-16px_rgba(18,20,40,0.18)] [--dg-c1:#6366f1] [--dg-c2:#0ea5e9] [--dg-c3:#f59e0b] [--dg-c4:#10b981] [--dg-c5:#8b5cf6] [--dg-c6:#f43f5e] [--dg-c7:#14b8a6] [--dg-pos:#10b981] [--dg-surface:#ffffff]">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13px] font-medium">{title}</p>
        {meta ? <p className="text-[11px] text-[#8a8fa3]">{meta}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function Slide({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full bg-[#101014] px-7 pt-6 pb-5 text-[#ececf1] [--dg-c1:#7dd3fc] [--dg-c2:#f0abfc] [--dg-c3:#fde68a] [--dg-c4:#86efac] [--dg-c5:#c4b5fd] [--dg-c6:#fda4af] [--dg-c7:#5eead4] [--dg-surface:#101014]">
      <p className="text-[17px] font-semibold tracking-tight">{title}</p>
      <div className="mt-5">{children}</div>
      {footer ? (
        <p className="mt-4 text-[10.5px] tracking-[0.08em] text-[#5f5f6b] uppercase">
          {footer}
        </p>
      ) : null}
    </div>
  );
}
