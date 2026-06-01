import type { CSSProperties, ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import {
  Calendar,
  Check,
  CloudSun,
  MapPin,
  Music,
  Plane,
  Play,
  ShieldCheck,
  Star,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UIRegistry } from "./types";

// Fixed token -> full class strings so Tailwind's JIT picks them up.
const ALIGN = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;
const JUSTIFY = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;
const SIZE = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
} as const;
const COLOR = {
  emphasis: "text-foreground",
  secondary: "text-muted-foreground",
  "alpha-70": "text-foreground/70",
  white: "text-white",
  "white-70": "text-white/70",
  "white-50": "text-white/50",
} as const;

const RADIUS = { sm: 4, md: 8, lg: 12, full: 9999 } as const;
const WEIGHT = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;
const TEXT_ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

const cls = <T extends string>(
  map: Record<T, string>,
  key: T | undefined,
): string | undefined => (key ? map[key] : undefined);

// Spacing units follow Tailwind's 0.25rem scale (gap: 3 -> 12px).
const space = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : `${n * 4}px`;

type Common = { children?: ReactNode };

function Card({
  padding = 4,
  background,
  children,
}: Common & { padding?: number; background?: string }) {
  const style: CSSProperties = { padding: space(padding) };
  if (background) style.background = background;
  return (
    <div
      className="border-border/60 bg-card w-full rounded-xl border"
      style={style}
    >
      {children}
    </div>
  );
}

function Box({
  width,
  height,
  radius,
  background,
  padding,
  children,
}: Common & {
  width?: number | string;
  height?: number | string;
  radius?: number | keyof typeof RADIUS;
  background?: string;
  padding?: number;
}) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;
  if (padding !== undefined) style.padding = space(padding);
  if (radius !== undefined)
    style.borderRadius = typeof radius === "number" ? radius : RADIUS[radius];
  if (background)
    style.background = background === "white" ? "#ffffff" : background;
  return <div style={style}>{children}</div>;
}

function Col({
  gap,
  align,
  justify,
  children,
}: Common & {
  gap?: number;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
}) {
  return (
    <div
      className={cn("flex flex-col", cls(ALIGN, align), cls(JUSTIFY, justify))}
      style={{ gap: space(gap) }}
    >
      {children}
    </div>
  );
}

function Row({
  gap,
  align,
  justify,
  children,
}: Common & {
  gap?: number;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
}) {
  return (
    <div
      className={cn("flex flex-row", cls(ALIGN, align), cls(JUSTIFY, justify))}
      style={{ gap: space(gap) }}
    >
      {children}
    </div>
  );
}

function Spacer() {
  return <div className="flex-1" />;
}

function Divider({
  flush,
  tone = "default",
}: {
  flush?: boolean;
  tone?: "default" | "light";
}) {
  return (
    <hr
      className={cn(
        tone === "light" ? "border-white/20" : "border-border/60",
        flush ? "-mx-4" : "",
      )}
    />
  );
}

function Text({
  value,
  size = "md",
  color,
  weight,
  textAlign,
  children,
}: Common & {
  value?: string;
  size?: keyof typeof SIZE;
  color?: keyof typeof COLOR;
  weight?: keyof typeof WEIGHT;
  textAlign?: keyof typeof TEXT_ALIGN;
}) {
  return (
    <span
      className={cn(
        SIZE[size],
        cls(COLOR, color),
        cls(WEIGHT, weight),
        cls(TEXT_ALIGN, textAlign),
      )}
    >
      {value ?? children}
    </span>
  );
}

function Title({
  value,
  size = "xl",
  color = "emphasis",
  weight = "semibold",
  textAlign,
  children,
}: Common & {
  value?: string;
  size?: keyof typeof SIZE;
  color?: keyof typeof COLOR;
  weight?: keyof typeof WEIGHT;
  textAlign?: keyof typeof TEXT_ALIGN;
}) {
  return (
    <span
      className={cn(
        "tracking-tight",
        SIZE[size],
        cls(COLOR, color),
        cls(WEIGHT, weight),
        cls(TEXT_ALIGN, textAlign),
      )}
    >
      {value ?? children}
    </span>
  );
}

function Caption({
  value,
  color = "secondary",
  children,
}: Common & { value?: string; color?: keyof typeof COLOR }) {
  return (
    <span className={cn("text-xs", cls(COLOR, color))}>
      {value ?? children}
    </span>
  );
}

function Image({
  src,
  size = 40,
  alt = "",
  rounded = true,
}: {
  src: string;
  size?: number;
  alt?: string;
  rounded?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("object-cover", rounded && "rounded-md")}
    />
  );
}

function BadgeNode({
  value,
  variant,
  children,
}: Common & {
  value?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  return <Badge variant={variant}>{value ?? children}</Badge>;
}

function ButtonNode({
  label,
  variant,
  size,
  block,
  onClick,
  children,
}: Common & {
  label?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  block?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={block ? "w-full" : undefined}
    >
      {label ?? children}
    </Button>
  );
}

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  "shield-check": ShieldCheck,
  "map-pin": MapPin,
  check: Check,
  x: X,
  star: Star,
  "cloud-sun": CloudSun,
  music: Music,
  play: Play,
  user: User,
  plane: Plane,
};

function Icon({
  name,
  size = 20,
  color,
}: {
  name: string;
  size?: number;
  color?: keyof typeof COLOR;
}) {
  const LucideComp = ICONS[name];
  if (!LucideComp) return null;
  return <LucideComp size={size} className={cls(COLOR, color)} />;
}

function Chart({
  variant = "bar",
  data = [],
  xKey = "label",
  dataKey = "value",
  color = "var(--chart-1)",
  height,
}: {
  variant?: "bar" | "line" | "sparkline";
  data?: Array<Record<string, string | number>>;
  xKey?: string;
  dataKey?: string;
  color?: string;
  height?: number;
}) {
  const h = height ?? (variant === "sparkline" ? 56 : 160);
  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={data} margin={{ top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickMargin={6}
            />
            <Bar dataKey={dataKey} fill={color} radius={4} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, bottom: 4 }}>
            {variant === "line" && (
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickMargin={6}
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * The shipped primitive vocabulary. Users spread this with their own components
 * (`{ ...DEFAULT_REGISTRY, MyChart }`) to render a JSON spec; all resolve by the
 * node's `type` against the same registry.
 */
export {
  Card,
  Box,
  Col,
  Row,
  Spacer,
  Divider,
  Text,
  Title,
  Caption,
  Image,
  Icon,
  Chart,
  BadgeNode as Badge,
  ButtonNode as Button,
};

export const DEFAULT_REGISTRY: UIRegistry = {
  Card,
  Box,
  Col,
  Row,
  Spacer,
  Divider,
  Text,
  Title,
  Caption,
  Image,
  Icon,
  Chart,
  Badge: BadgeNode,
  Button: ButtonNode,
};
