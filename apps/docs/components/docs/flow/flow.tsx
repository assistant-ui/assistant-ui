import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FlowExpand } from "./flow-expand";

export function Flow({
  className,
  children,
  llm: _llm,
}: {
  className?: string;
  children: ReactNode;
  llm?: string;
}) {
  return (
    <div
      className={cn(
        "not-prose my-6 overflow-x-auto overflow-y-hidden",
        className,
      )}
    >
      <FlowExpand>
        <div className="mx-auto w-fit py-3">{children}</div>
      </FlowExpand>
    </div>
  );
}

export function FlowRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      {children}
    </div>
  );
}

export function FlowColumn({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {children}
    </div>
  );
}

export function FlowGroup({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-flow-id={id}
      className={cn(
        "border-border relative rounded-xl border border-dashed p-4",
        className,
      )}
    >
      <span className="bg-background text-muted-foreground absolute -top-2 left-3 px-1.5 text-[10px] font-medium tracking-widest uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

const toneClasses = {
  pink: "border-pink-500/60 bg-pink-500/10",
  blue: "border-blue-500/60 bg-blue-500/10",
  red: "border-red-500/60 bg-red-500/10",
  green: "border-green-500/60 bg-green-500/10",
};

type FlowNodeProps = {
  id?: string;
  children: ReactNode;
} & (
  | { variant?: "box"; tone?: keyof typeof toneClasses }
  | { variant: "decision"; tone?: never }
);

export function FlowNode({
  id,
  tone,
  variant = "box",
  children,
}: FlowNodeProps) {
  const className = cn(
    "relative inline-flex items-center justify-center text-sm whitespace-nowrap",
    variant === "box" &&
      "bg-card text-card-foreground border-border rounded-md border px-3.5 py-1.5",
    variant === "box" && tone && toneClasses[tone],
    variant === "decision" && "text-card-foreground px-8 py-4",
  );
  return (
    <span data-flow-id={id} className={className}>
      {variant === "decision" && (
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="50,1 99,50 50,99 1,50"
            vectorEffect="non-scaling-stroke"
            strokeWidth={1}
            className="fill-card stroke-border"
          />
        </svg>
      )}
      <span className="relative">{children}</span>
    </span>
  );
}

export function FlowLLM({ llm }: { llm?: string; children?: ReactNode }) {
  if (!llm) return null;
  return (
    <pre>
      <code className="language-mermaid">{llm}</code>
    </pre>
  );
}

export function FlowArrow({
  label,
  reverseLabel,
  direction = "right",
  length = 88,
}: {
  label?: string;
  reverseLabel?: string;
  direction?: "right" | "down";
  length?: number;
}) {
  if (direction === "down") {
    return (
      <div className="text-muted-foreground/70 relative flex justify-center">
        <svg aria-hidden width={10} height={length}>
          <line
            x1={5}
            y1={0}
            x2={5}
            y2={length - 6}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <path
            d={`M 1.5 ${length - 7} L 5 ${length} L 8.5 ${length - 7} Z`}
            fill="currentColor"
          />
        </svg>
        {label && (
          <span className="absolute top-1/2 left-1/2 ml-2.5 -translate-y-1/2 text-xs whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="text-muted-foreground/70 flex flex-col items-center gap-1">
      {label && <span className="text-xs whitespace-nowrap">{label}</span>}
      <svg aria-hidden width={length} height={10}>
        <line
          x1={0}
          y1={5}
          x2={length - 6}
          y2={5}
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <path
          d={`M ${length - 7} 1.5 L ${length} 5 L ${length - 7} 8.5 Z`}
          fill="currentColor"
        />
      </svg>
      {reverseLabel && (
        <>
          <svg aria-hidden width={length} height={10}>
            <line
              x1={6}
              y1={5}
              x2={length}
              y2={5}
              stroke="currentColor"
              strokeWidth={1.5}
            />
            <path d="M 7 1.5 L 0 5 L 7 8.5 Z" fill="currentColor" />
          </svg>
          <span className="text-xs whitespace-nowrap">{reverseLabel}</span>
        </>
      )}
    </div>
  );
}
