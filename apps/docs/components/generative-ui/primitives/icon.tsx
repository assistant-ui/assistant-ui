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
import { COLOR, cls } from "./tokens";

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

export function Icon({
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
