import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The home demo's lift; an inline style, because the docs theme zeroes the `--shadow-*` tokens. */
export const LIFT_SHADOW: CSSProperties = {
  boxShadow: "0 1px 2px rgb(0 0 0 / 0.05), 0 24px 48px -20px rgb(0 0 0 / 0.28)",
};

/**
 * A hero demo framed like the home demo: optional controls above, one lifted
 * frame, and one caption line under it.
 */
export function DemoFrame({
  above,
  caption,
  aside,
  className,
  frameClassName,
  children,
}: {
  /** Tabs or controls for the whole demo, on the row above the frame. */
  above?: ReactNode;
  /** One muted line under the frame. */
  caption?: ReactNode;
  /** A link at the end of the caption line. */
  aside?: ReactNode;
  className?: string;
  /** Sizes the frame; give it a fixed height so switching views does not move the hero. */
  frameClassName?: string;
  children: ReactNode;
}) {
  return (
    <figure className={cn("flex min-w-0 flex-col", className)}>
      {above ? <div className="mb-3">{above}</div> : null}
      <div
        className={cn(
          "border-foreground/10 rounded-document bg-background flex flex-col overflow-hidden border",
          frameClassName,
        )}
        style={LIFT_SHADOW}
      >
        {children}
      </div>
      {caption || aside ? (
        <figcaption className="flex items-baseline justify-between gap-4 pt-3 text-[13px]">
          <span className="text-muted-foreground min-w-0 text-pretty">
            {caption}
          </span>
          {aside ? <span className="shrink-0">{aside}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
