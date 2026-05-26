"use client";

import type { ComponentType, PropsWithChildren } from "react";

/**
 * The component allowlist passed to `<MessagePrimitive.GenerativeUI />`.
 * The agent's JSON spec can reference any of these by name.
 */

export const UnknownComponentFallback = ({
  component,
}: {
  component: string;
}) => (
  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
    unknown component: {component}
  </span>
);

const Card: ComponentType<
  PropsWithChildren<{ title?: string; description?: string }>
> = ({ title, description, children }) => (
  <div className="rounded-xl border bg-card p-4 shadow-sm">
    {title ? <div className="font-semibold text-base">{title}</div> : null}
    {description ? (
      <div className="mt-1 text-muted-foreground text-sm">{description}</div>
    ) : null}
    {children ? <div className="mt-3">{children}</div> : null}
  </div>
);

const Button: ComponentType<
  PropsWithChildren<{
    label?: string;
    variant?: "primary" | "secondary";
    onClickPrompt?: string;
  }>
> = ({ label, variant = "primary", onClickPrompt, children }) => {
  const cls =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "bg-secondary text-secondary-foreground hover:bg-secondary/80";
  return (
    <button
      type="button"
      className={`mt-2 inline-flex items-center rounded-md px-3 py-1.5 font-medium text-sm ${cls}`}
      onClick={() => {
        if (onClickPrompt) {
          // In a richer integration this would call composer.setText / send.
          alert(`button -> ${onClickPrompt}`);
        }
      }}
    >
      {children ?? label ?? "Click"}
    </button>
  );
};

const Stack: ComponentType<
  PropsWithChildren<{ gap?: "sm" | "md" | "lg"; direction?: "row" | "column" }>
> = ({ gap = "md", direction = "column", children }) => {
  const gapClass = gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4";
  const dirClass = direction === "row" ? "flex-row" : "flex-col";
  return <div className={`flex ${dirClass} ${gapClass}`}>{children}</div>;
};

const Heading: ComponentType<
  PropsWithChildren<{ level?: 1 | 2 | 3; children?: React.ReactNode }>
> = ({ level = 2, children }) => {
  const cls =
    level === 1
      ? "text-2xl font-bold"
      : level === 2
        ? "text-lg font-semibold"
        : "text-base font-semibold";
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  return <Tag className={cls}>{children}</Tag>;
};

const Text: ComponentType<PropsWithChildren> = ({ children }) => (
  <p className="text-foreground text-sm leading-6">{children}</p>
);

const Stat: ComponentType<{ label: string; value: string | number }> = ({
  label,
  value,
}) => (
  <div className="flex flex-col rounded-lg border bg-muted/40 p-3">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className="font-semibold text-xl">{value}</span>
  </div>
);

export const componentsAllowlist = {
  Card,
  Button,
  Stack,
  Heading,
  Text,
  Stat,
} as const;
