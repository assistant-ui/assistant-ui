import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CalloutType =
  | "info"
  | "warn"
  | "warning"
  | "error"
  | "success"
  | "idea"
  | "tip"
  | "note";

const typeConfig = {
  info: {
    label: "Info",
    ruleClassName: "border-blue-500",
    labelClassName: "text-blue-600 dark:text-blue-400",
  },
  note: {
    label: "Note",
    ruleClassName: "border-blue-500",
    labelClassName: "text-blue-600 dark:text-blue-400",
  },
  tip: {
    label: "Tip",
    ruleClassName: "border-blue-500",
    labelClassName: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    label: "Warning",
    ruleClassName: "border-amber-500",
    labelClassName: "text-amber-600 dark:text-amber-400",
  },
  error: {
    label: "Error",
    ruleClassName: "border-destructive",
    labelClassName: "text-destructive",
  },
  success: {
    label: "Success",
    ruleClassName: "border-green-600 dark:border-green-500",
    labelClassName: "text-green-700 dark:text-green-400",
  },
  idea: {
    label: "Idea",
    ruleClassName: "border-purple-500",
    labelClassName: "text-purple-600 dark:text-purple-400",
  },
};

function resolveType(type: CalloutType): keyof typeof typeConfig {
  if (type === "warn") return "warning";
  return type;
}

export interface CalloutProps extends Omit<ComponentProps<"div">, "title"> {
  type?: CalloutType;
  title?: ReactNode;
  children?: ReactNode;
}

export function Callout({
  type: inputType = "info",
  title,
  children,
  className,
  ...props
}: CalloutProps) {
  const config = typeConfig[resolveType(inputType)];

  return (
    <div
      className={cn(
        "not-prose bg-foreground/[0.025] dark:bg-foreground/[0.04] my-4 border-s-2 px-4 py-3 text-sm",
        config.ruleClassName,
        className,
      )}
      {...props}
    >
      <p
        className={cn(
          "font-mono text-[11px] font-medium tracking-wide uppercase",
          config.labelClassName,
        )}
      >
        {title ?? config.label}
      </p>
      <div className="[&_blockquote]:border-foreground/20 [&_code]:bg-foreground/[0.06] [&_kbd]:border-foreground/15 [&_kbd]:bg-foreground/[0.04] mt-1.5 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_blockquote]:italic [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.8125rem] [&_kbd]:border [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:font-mono [&_kbd]:text-[0.8125rem] [&_li]:py-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-4 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-4">
        {children}
      </div>
    </div>
  );
}
