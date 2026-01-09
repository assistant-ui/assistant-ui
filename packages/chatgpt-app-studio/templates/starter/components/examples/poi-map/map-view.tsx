"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { POI, MapCenter, POICategory } from "./schema";
import { cn, Skeleton } from "./_adapter";

export const CATEGORY_COLORS: Record<POICategory, string> = {
  restaurant: "#ef4444",
  cafe: "#f97316",
  museum: "#8b5cf6",
  park: "#22c55e",
  shopping: "#ec4899",
  entertainment: "#f59e0b",
  landmark: "#3b82f6",
  transit: "#6366f1",
  other: "#6b7280",
};

export interface MapViewProps {
  pois: POI[];
  center: MapCenter;
  zoom: number;
  selectedPoiId: string | null;
  favoriteIds: Set<string>;
  onSelectPoi: (id: string) => void;
  onMoveEnd?: (center: MapCenter, zoom: number) => void;
  theme?: "light" | "dark";
  className?: string;
}

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-clip", className)}>
      <Skeleton className="absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <MapPin className="size-8 text-muted-foreground/50 motion-safe:animate-pulse" />
        <span className="text-muted-foreground text-sm">Loading map...</span>
      </div>
    </div>
  );
}

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapView({ className, ...props }: MapViewProps) {
  return (
    <div className={cn("relative h-full w-full overflow-clip", className)}>
      <LeafletMap {...props} />
    </div>
  );
}
