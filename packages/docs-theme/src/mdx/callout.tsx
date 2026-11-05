import type { ComponentProps, ReactNode } from "react";
import { cn } from "../site/utils";

export type CalloutType =
  | "info"
  | "warn"
  | "warning"
  | "error"
  | "success"
  | "idea"
  | "tip"
  | "note";

const labels = {
  info: "Info",
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  error: "Error",
  success: "Success",
  idea: "Idea",
};

export interface CalloutProps extends Omit<ComponentProps<"div">, "title"> {
  type?: CalloutType;
  title?: ReactNode;
}

export function Callout({
  type: inputType = "info",
  title,
  className,
  children,
  ...props
}: CalloutProps) {
  const type = inputType === "warn" ? "warning" : inputType;
  return (
    <div
      {...props}
      data-type={type}
      className={cn("aui-docs-callout not-prose", className)}
    >
      <p className="aui-docs-callout-label">{title ?? labels[type]}</p>
      <div className="aui-docs-callout-body">{children}</div>
    </div>
  );
}
