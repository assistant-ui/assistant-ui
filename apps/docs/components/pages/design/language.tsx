import type { ReactNode } from "react";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";

export function Register({
  index,
  label,
  claim,
  children,
}: {
  index: number;
  label: string;
  claim: string;
  children: ReactNode;
}) {
  return (
    <section className="border-foreground/10 scroll-mt-24 border-t pt-6">
      <div className="flex items-baseline gap-3">
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className={cn(typeEyebrow, "text-foreground")}>{label}</h2>
      </div>
      <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-pretty">
        {claim}
      </p>
      {children}
    </section>
  );
}

export function Plate({
  caption,
  className,
  children,
}: {
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex min-w-0 flex-col">
      <div
        className={cn(
          "border-foreground/10 flex h-32 items-center justify-center border",
          className,
        )}
      >
        {children}
      </div>
      <figcaption className="text-muted-foreground mt-2.5 font-mono text-[11px]">
        {caption}
      </figcaption>
    </figure>
  );
}

export function Ledger({ children }: { children: ReactNode }) {
  return <dl className="mt-8 flex flex-col">{children}</dl>;
}

export function Row({
  name,
  value,
  note,
  sample,
}: {
  name: string;
  value?: string;
  note: string;
  sample?: ReactNode;
}) {
  return (
    <div className="hover:bg-foreground/[0.025] -mx-2 flex items-center gap-4 px-2 py-2 transition-colors">
      {sample ? <div className="w-10 shrink-0">{sample}</div> : null}
      <dt className="flex min-w-0 shrink-0 items-baseline gap-2 md:w-72">
        <span className="font-mono text-[12.5px] font-medium">{name}</span>
        {value ? (
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {value}
          </span>
        ) : null}
      </dt>
      <dd className="text-muted-foreground min-w-0 flex-1 text-[13px] leading-relaxed">
        {note}
      </dd>
    </div>
  );
}

export function Swatch({ color, ring }: { color: string; ring?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ background: color }}
      className={cn("block size-8", ring && "border-foreground/15 border")}
    />
  );
}

export function Corner({ radius }: { radius: string }) {
  return (
    <span
      aria-hidden
      style={{ borderRadius: radius }}
      className="bg-foreground/[0.08] border-foreground/25 block size-8 border"
    />
  );
}
