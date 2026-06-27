import {
  CloudSun,
  Sun,
  CloudRain,
  Cloud,
  Wind,
  Snowflake,
  Zap,
  Plane,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Bell,
  Mail,
  ShoppingCart,
  Music,
  TrendingUp,
  TrendingDown,
  Globe,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "cloud-sun": CloudSun,
  sun: Sun,
  "cloud-rain": CloudRain,
  cloud: Cloud,
  wind: Wind,
  snowflake: Snowflake,
  zap: Zap,
  plane: Plane,
  "check-circle": CheckCircle2,
  clock: Clock,
  "map-pin": MapPin,
  calendar: Calendar,
  bell: Bell,
  mail: Mail,
  "shopping-cart": ShoppingCart,
  music: Music,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  globe: Globe,
};

export function StyledIcon({
  name,
  size,
  color,
}: {
  name: string;
  size?: string;
  color?: string;
}) {
  const Icon = ICONS[name] ?? CloudSun;
  const sizes: Record<string, string> = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
    "2xl": "h-10 w-10",
    "3xl": "h-12 w-12",
  };
  const colorClass =
    color === "white"
      ? "text-white"
      : color === "muted"
        ? "text-muted-foreground"
        : "text-current";
  return <Icon className={`${sizes[size ?? "md"]!} ${colorClass}`} />;
}
