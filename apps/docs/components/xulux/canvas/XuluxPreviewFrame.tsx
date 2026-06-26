"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { XuluxPreviewFrame as XuluxPreviewFrameConfig } from "../templates/types";

type Props = {
  frame?: XuluxPreviewFrameConfig | undefined;
  children: ReactNode;
  className?: string | undefined;
};

export function XuluxPreviewFrame({ frame, children, className }: Props) {
  if (!frame) {
    return <div className={cn("h-full w-full", className)}>{children}</div>;
  }

  if (frame.kind === "terminal") {
    const width = frame.width ?? 800;
    const height = frame.height ?? 480;
    const terminalStyle = {
      width: `min(${width}px, calc(100cqw - 2rem))`,
      height: `min(${height}px, calc(100cqh - 2rem))`,
    } satisfies CSSProperties;

    return (
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden bg-[#09090b] p-4",
          className,
        )}
        style={{ containerType: "size" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_45%_at_50%_38%,rgba(16,185,129,0.12)_0%,transparent_72%)]" />
        <div
          className="relative flex min-h-0 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-[0_25px_80px_-24px_rgba(0,0,0,0.85),0_0_60px_rgba(16,185,129,0.08)]"
          style={terminalStyle}
        >
          <div className="flex min-h-0 w-full flex-col">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-[#ff5f57]" />
                <div className="size-3 rounded-full bg-[#febc2e]" />
                <div className="size-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="min-w-0 flex-1 truncate text-center font-mono text-[13px] text-white/50">
                {frame.title ?? "terminal"}
              </div>
              <div className="w-[54px]" aria-hidden />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden bg-black">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const width = frame.width ?? 320;
  const aspectRatio = frame.aspectRatio ?? "9 / 19.5";
  const phoneStyle = {
    width: `min(${width}px, calc(100cqw - 2rem), calc((100cqh - 2rem) * 9 / 19.5))`,
    aspectRatio,
  } satisfies CSSProperties;

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-[#09090b] p-4",
        className,
      )}
      style={{ containerType: "size" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_40%,rgba(139,92,246,0.10)_0%,transparent_70%)]" />
      <div
        className="relative rounded-[2.5rem] bg-[#1a1a1a] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.08)]"
        style={phoneStyle}
      >
        <div className="pointer-events-none absolute inset-[-2px] rounded-[2.75rem] border border-white/10" />
        <div className="absolute top-3 left-1/2 z-10 h-7 w-[37.5%] -translate-x-1/2 rounded-b-2xl bg-[#1a1a1a]" />
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-black">
          {children}
        </div>
      </div>
    </div>
  );
}
