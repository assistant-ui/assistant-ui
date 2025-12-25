"use client";

import * as React from "react";
import { cn } from "../../utils/cn";
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../shared";
import type { FormatConfig } from "./types";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

interface DeltaValueProps {
  value: number;
  options?: Extract<FormatConfig, { kind: "delta" }>;
}

export function DeltaValue({ value, options }: DeltaValueProps) {
  const decimals = options?.decimals ?? 2;
  const upIsPositive = options?.upIsPositive ?? true;
  const showSign = options?.showSign ?? true;

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const isGood = upIsPositive ? isPositive : isNegative;
  const isBad = upIsPositive ? isNegative : isPositive;

  const colorClass = isGood
    ? "text-green-700 dark:text-green-500"
    : isBad
      ? "text-destructive"
      : "text-muted-foreground";

  const formatted = value.toFixed(decimals);
  const display = showSign && !isNegative ? `+${formatted}` : formatted;

  const arrow = isPositive ? "\u2191" : isNegative ? "\u2193" : "";

  return (
    <span className={cn("tabular-nums", colorClass)}>
      {display}
      {!isNeutral && <span className="ml-0.5">{arrow}</span>}
    </span>
  );
}

interface StatusBadgeProps {
  value: string;
  options?: Extract<FormatConfig, { kind: "status" }>;
}

export function StatusBadge({ value, options }: StatusBadgeProps) {
  const config = options?.statusMap?.[value] ?? {
    tone: "neutral" as Tone,
    label: value,
  };
  const label = config.label ?? value;

  const variant =
    config.tone === "danger"
      ? "destructive"
      : config.tone === "neutral"
        ? "outline"
        : "secondary";

  return (
    <Badge
      variant={variant}
      className={cn(
        "border",
        config.tone === "warning" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-100",
        config.tone === "success" &&
          "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-100",
        config.tone === "info" &&
          "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-100",
        config.tone === "danger" &&
          "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-100",
      )}
    >
      {label}
    </Badge>
  );
}

interface CurrencyValueProps {
  value: number;
  options?: Extract<FormatConfig, { kind: "currency" }>;
  locale?: string | undefined;
}

export function CurrencyValue({ value, options, locale }: CurrencyValueProps) {
  const currency = options?.currency ?? "USD";
  const decimals = options?.decimals ?? 2;

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return <span className="tabular-nums">{formatted}</span>;
}

interface PercentValueProps {
  value: number;
  options?: Extract<FormatConfig, { kind: "percent" }>;
}

export function PercentValue({ value, options }: PercentValueProps) {
  const decimals = options?.decimals ?? 2;
  const showSign = options?.showSign ?? false;
  const basis = options?.basis ?? "fraction";

  const numeric = basis === "fraction" ? value * 100 : value;
  const absFormatted = Math.abs(numeric).toFixed(decimals);
  const signed =
    numeric > 0 && showSign
      ? `+${absFormatted}`
      : numeric < 0
        ? `-${absFormatted}`
        : absFormatted;

  return <span className="font-mono tabular-nums">{signed}%</span>;
}

interface DateValueProps {
  value: string;
  options?: Extract<FormatConfig, { kind: "date" }>;
  locale?: string | undefined;
}

export function DateValue({ value, options, locale }: DateValueProps) {
  const dateFormat = options?.dateFormat ?? "short";
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return <span>Invalid date</span>;
  }

  let formatted: string;

  if (dateFormat === "relative") {
    formatted = getRelativeTime(date, locale);
  } else if (dateFormat === "long") {
    formatted = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } else {
    formatted = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  const title = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return <span title={title}>{formatted}</span>;
}

function getRelativeTime(date: Date, locale?: string): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

interface BooleanValueProps {
  value: boolean;
  options?: Extract<FormatConfig, { kind: "boolean" }>;
}

export function BooleanValue({ value, options }: BooleanValueProps) {
  const labels = options?.labels ?? { true: "Yes", false: "No" };
  const label = value ? labels.true : labels.false;
  const variant = value ? "secondary" : "outline";

  return <Badge variant={variant}>{label}</Badge>;
}

interface LinkValueProps {
  value: string;
  options?: Extract<FormatConfig, { kind: "link" }>;
  row?:
    | Record<
        string,
        string | number | boolean | null | (string | number | boolean | null)[]
      >
    | undefined;
}

export function LinkValue({ value, options, row }: LinkValueProps) {
  const href =
    options?.hrefKey && row ? String(row[options.hrefKey] ?? "") : value;
  const external = options?.external ?? false;

  if (!href) {
    return <span>{value}</span>;
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-accent-foreground inline-block max-w-full break-words underline underline-offset-2 hover:opacity-90"
      aria-label={external ? `${value} (opens in a new tab)` : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {value}
      {external && (
        <span className="ml-1 inline-block" aria-label="Opens in new tab">
          \u2197
        </span>
      )}
    </a>
  );
}

interface NumberValueProps {
  value: number;
  options?: Extract<FormatConfig, { kind: "number" }>;
  locale?: string | undefined;
}

export function NumberValue({ value, options, locale }: NumberValueProps) {
  const decimals = options?.decimals ?? 0;
  const unit = options?.unit ?? "";
  const compact = options?.compact ?? false;
  const showSign = options?.showSign ?? false;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? "compact" : "standard",
  }).format(value);

  const display = showSign && value > 0 ? `+${formatted}` : formatted;

  return (
    <span className="font-mono tabular-nums">
      {display}
      {unit}
    </span>
  );
}

interface BadgeValueProps {
  value: string;
  options?: Extract<FormatConfig, { kind: "badge" }>;
}

export function BadgeValue({ value, options }: BadgeValueProps) {
  const tone = options?.colorMap?.[value] ?? "neutral";

  const variant =
    tone === "danger"
      ? "destructive"
      : tone === "neutral"
        ? "outline"
        : "secondary";

  return (
    <Badge
      variant={variant}
      className={cn(
        "border",
        tone === "warning" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-100",
        tone === "success" &&
          "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-100",
        tone === "info" &&
          "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-100",
        tone === "danger" &&
          "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-100",
      )}
    >
      {value}
    </Badge>
  );
}

interface ArrayValueProps {
  value: (string | number | boolean | null)[] | string;
  options?: Extract<FormatConfig, { kind: "array" }>;
}

export function ArrayValue({ value, options }: ArrayValueProps) {
  const maxVisible = options?.maxVisible ?? 3;
  const items: (string | number | boolean | null)[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",").map((s) => s.trim())
      : [];

  if (items.length === 0) {
    return <span className="text-muted">\u2014</span>;
  }

  const visible = items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  const hidden = items.slice(maxVisible);

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {visible.map((item, i) => (
        <span
          key={i}
          className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5"
        >
          {item === null ? "null" : String(item)}
        </span>
      ))}
      {remaining > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground cursor-default">
              +{remaining} more
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {hidden
              .map((item) => (item === null ? "null" : String(item)))
              .join(", ")}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

interface RenderFormattedValueParams {
  value:
    | string
    | number
    | boolean
    | null
    | (string | number | boolean | null)[];
  column: { format?: FormatConfig | undefined };
  row?:
    | Record<
        string,
        string | number | boolean | null | (string | number | boolean | null)[]
      >
    | undefined;
  locale?: string | undefined;
}

export function renderFormattedValue({
  value,
  column,
  row,
  locale,
}: RenderFormattedValueParams): React.ReactNode {
  if (value == null || value === "") {
    return <span className="text-muted">\u2014</span>;
  }

  const fmt = column.format;

  switch (fmt?.kind) {
    case "delta":
      return <DeltaValue value={Number(value)} options={fmt} />;
    case "status":
      return <StatusBadge value={String(value)} options={fmt} />;
    case "currency":
      return (
        <CurrencyValue value={Number(value)} options={fmt} locale={locale} />
      );
    case "percent":
      return <PercentValue value={Number(value)} options={fmt} />;
    case "date":
      return <DateValue value={String(value)} options={fmt} locale={locale} />;
    case "boolean":
      return <BooleanValue value={Boolean(value)} options={fmt} />;
    case "link":
      return <LinkValue value={String(value)} options={fmt} row={row} />;
    case "number":
      return (
        <NumberValue value={Number(value)} options={fmt} locale={locale} />
      );
    case "badge":
      return <BadgeValue value={String(value)} options={fmt} />;
    case "array":
      return (
        <ArrayValue
          value={Array.isArray(value) ? value : String(value)}
          options={fmt}
        />
      );
    case "text":
    default:
      return String(value);
  }
}
