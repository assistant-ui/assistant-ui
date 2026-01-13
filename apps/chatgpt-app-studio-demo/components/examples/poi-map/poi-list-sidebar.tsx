"use client";

import { useRef, useEffect } from "react";
import type { POI } from "./schema";
import { POICard } from "./poi-card";
import { cn } from "./_adapter";

interface POIListSidebarProps {
  pois: POI[];
  selectedPoiId: string | null;
  favoriteIds: Set<string>;
  onSelectPoi: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onViewDetails?: (id: string) => void;
  className?: string;
}

export function POIListSidebar({
  pois,
  selectedPoiId,
  favoriteIds,
  onSelectPoi,
  onToggleFavorite,
  onViewDetails,
  className,
}: POIListSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrolledPoiIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedPoiId) {
      lastScrolledPoiIdRef.current = null;
      return;
    }

    if (!scrollRef.current) return;
    if (lastScrolledPoiIdRef.current === selectedPoiId) return;

    const selectedCard = scrollRef.current.querySelector(
      `[data-poi-id="${selectedPoiId}"]`,
    );
    if (selectedCard) {
      selectedCard.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      lastScrolledPoiIdRef.current = selectedPoiId;
    }
  }, [selectedPoiId, pois]);

  if (pois.length === 0) {
    return (
      <div
        className={cn("flex h-full items-center justify-center p-4", className)}
      >
        <p className="text-muted-foreground text-sm">No locations found</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn("scrollbar-subtle h-full overflow-y-auto pr-1", className)}
    >
      <div className="flex flex-col gap-0.5">
        {pois.map((poi) => (
          <div key={poi.id} data-poi-id={poi.id}>
            <POICard
              poi={poi}
              isSelected={poi.id === selectedPoiId}
              isFavorite={favoriteIds.has(poi.id)}
              variant="expanded"
              onSelect={onSelectPoi}
              onToggleFavorite={onToggleFavorite}
              onViewDetails={onViewDetails}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
