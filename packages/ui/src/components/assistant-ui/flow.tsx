import type { ComponentProps, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { FlowCanvas } from "@/components/assistant-ui/flow-canvas";
import { FlowExpand } from "@/components/assistant-ui/flow-expand";
import { cn } from "@/lib/utils";

export type FlowRootProps = ComponentProps<"div"> & {
  llm?: string;
};

function FlowRoot({ className, children, llm: _llm, ...props }: FlowRootProps) {
  return (
    <div
      data-slot="flow-root"
      className={cn(
        "aui-flow-root not-prose my-6 overflow-x-auto overflow-y-hidden",
        className,
      )}
      {...props}
    >
      <FlowExpand>
        <div
          data-slot="flow-content"
          className="aui-flow-content mx-auto w-fit py-3"
        >
          {children}
        </div>
      </FlowExpand>
    </div>
  );
}

export type FlowRowProps = ComponentProps<"div">;

function FlowRow({ className, ...props }: FlowRowProps) {
  return (
    <div
      data-slot="flow-row"
      className={cn(
        "aui-flow-row flex items-center justify-center gap-3",
        className,
      )}
      {...props}
    />
  );
}

export type FlowColumnProps = ComponentProps<"div">;

function FlowColumn({ className, ...props }: FlowColumnProps) {
  return (
    <div
      data-slot="flow-column"
      className={cn(
        "aui-flow-column flex flex-col items-center gap-3",
        className,
      )}
      {...props}
    />
  );
}

export type FlowGroupProps = ComponentProps<"div"> & {
  flowId?: string;
};

function FlowGroup({ className, flowId, ...props }: FlowGroupProps) {
  return (
    <div
      data-slot="flow-group"
      data-flow-id={flowId}
      className={cn(
        "aui-flow-group border-border relative rounded-xl border border-dashed p-4",
        className,
      )}
      {...props}
    />
  );
}

export type FlowGroupLabelProps = ComponentProps<"span">;

function FlowGroupLabel({ className, ...props }: FlowGroupLabelProps) {
  return (
    <span
      data-slot="flow-group-label"
      className={cn(
        "aui-flow-group-label bg-background text-muted-foreground absolute -top-2 left-3 px-1.5 text-[10px] font-medium tracking-widest uppercase",
        className,
      )}
      {...props}
    />
  );
}

const flowNodeVariants = cva(
  "aui-flow-node relative inline-flex items-center justify-center text-sm whitespace-nowrap",
  {
    variants: {
      variant: {
        box: "bg-card text-card-foreground border-border rounded-md border px-3.5 py-1.5",
        decision: "text-card-foreground px-8 py-4",
      },
      tone: {
        default: "",
        pink: "border-pink-500/60 bg-pink-500/10",
        blue: "border-blue-500/60 bg-blue-500/10",
        red: "border-red-500/60 bg-red-500/10",
        green: "border-green-500/60 bg-green-500/10",
      },
    },
    defaultVariants: {
      variant: "box",
      tone: "default",
    },
  },
);

export type FlowNodeProps = ComponentProps<"span"> &
  VariantProps<typeof flowNodeVariants> & {
    flowId?: string;
  };

function FlowNode({
  className,
  flowId,
  variant = "box",
  tone,
  children,
  ...props
}: FlowNodeProps) {
  return (
    <span
      data-slot="flow-node"
      data-variant={variant}
      data-tone={tone ?? "default"}
      data-flow-id={flowId}
      className={cn(flowNodeVariants({ variant, tone }), className)}
      {...props}
    >
      {variant === "decision" && (
        <svg
          aria-hidden
          data-slot="flow-node-decision-shape"
          className="aui-flow-node-decision-shape absolute inset-0 h-full w-full"
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
      <span data-slot="flow-node-content" className="relative">
        {children}
      </span>
    </span>
  );
}

function FlowLLMRoot({ llm }: { llm?: string; children?: ReactNode }) {
  if (!llm) return null;
  return (
    <pre>
      <code className="language-mermaid">{llm}</code>
    </pre>
  );
}

function FlowLLMPassthrough({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

function FlowLLMArrow() {
  return null;
}

function FlowCanvasRoot(props: ComponentProps<typeof FlowCanvas>) {
  return <FlowCanvas {...props} />;
}

export type FlowArrowProps = ComponentProps<"div"> & {
  label?: ReactNode;
  reverseLabel?: ReactNode;
  direction?: "right" | "down";
  length?: number;
};

function FlowArrow({
  className,
  label,
  reverseLabel,
  direction = "right",
  length = 88,
  ...props
}: FlowArrowProps) {
  if (direction === "down") {
    return (
      <div
        data-slot="flow-arrow"
        data-direction={direction}
        className={cn(
          "aui-flow-arrow text-muted-foreground/70 relative flex justify-center",
          className,
        )}
        {...props}
      >
        <svg aria-hidden data-slot="flow-arrow-svg" width={10} height={length}>
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
          <span
            data-slot="flow-arrow-label"
            className="aui-flow-arrow-label absolute top-1/2 left-1/2 ml-2.5 -translate-y-1/2 text-xs whitespace-nowrap"
          >
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      data-slot="flow-arrow"
      data-direction={direction}
      className={cn(
        "aui-flow-arrow text-muted-foreground/70 flex flex-col items-center gap-1",
        className,
      )}
      {...props}
    >
      {label && (
        <span
          data-slot="flow-arrow-label"
          className="aui-flow-arrow-label text-xs whitespace-nowrap"
        >
          {label}
        </span>
      )}
      <svg aria-hidden data-slot="flow-arrow-svg" width={length} height={10}>
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
          <svg
            aria-hidden
            data-slot="flow-arrow-reverse-svg"
            width={length}
            height={10}
          >
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
          <span
            data-slot="flow-arrow-reverse-label"
            className="aui-flow-arrow-label text-xs whitespace-nowrap"
          >
            {reverseLabel}
          </span>
        </>
      )}
    </div>
  );
}

export const Flow = Object.assign(FlowRoot, {
  Arrow: FlowArrow,
  Canvas: FlowCanvasRoot,
  Column: FlowColumn,
  Group: FlowGroup,
  GroupLabel: FlowGroupLabel,
  Node: FlowNode,
  Root: FlowRoot,
  Row: FlowRow,
});

export const FlowLLM = Object.assign(FlowLLMRoot, {
  Arrow: FlowLLMArrow,
  Canvas: FlowLLMPassthrough,
  Column: FlowLLMPassthrough,
  Group: FlowLLMPassthrough,
  GroupLabel: FlowLLMPassthrough,
  Node: FlowLLMPassthrough,
  Root: FlowLLMRoot,
  Row: FlowLLMPassthrough,
});

export {
  FlowArrow,
  FlowCanvasRoot as FlowCanvas,
  FlowColumn,
  FlowGroup,
  FlowGroupLabel,
  FlowNode,
  FlowRoot,
  FlowRow,
  flowNodeVariants,
};
