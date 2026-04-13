"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { POI } from "./schema";
import { POICard } from "./poi-card";
import { cn } from "./_adapter";

interface POIListInlineProps {
  pois: POI[];
  selectedPoiId: string | null;
  favoriteIds: Set<string>;
  onSelectPoi: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  className?: string;
}

export function POIListInline({
  pois,
  selectedPoiId,
  favoriteIds,
  onSelectPoi,
  onToggleFavorite,
  className,
}: POIListInlineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrolledPoiIdRef = useRef<string | null>(null);
  const [scrollState, setScrollState] = useState({
    atStart: true,
    atEnd: false,
  });

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setScrollState({ atStart, atEnd });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState, pois]);

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
        inline: "center",
      });
      lastScrolledPoiIdRef.current = selectedPoiId;
    }
  }, [selectedPoiId, pois]);

  if (pois.length === 0) {
    return (
      <div
        className={cn(
          "flex h-24 items-center justify-center rounded-2xl bg-background/80 backdrop-blur-md",
          className,
        )}
        style={{
          boxShadow:
            "0 -4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
        }}
      >
        <p className="text-muted-foreground text-sm">No locations found</p>
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-2xl", className)}
      style={{
        boxShadow:
          "0 -4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
      }}
    >
      <div className="bg-background/80 backdrop-blur-md">
        <div
          ref={scrollRef}
          className="scrollbar-none flex gap-2.5 overflow-x-auto px-3 py-3"
        >
          {pois.map((poi) => (
            <div key={poi.id} data-poi-id={poi.id}>
              <POICard
                poi={poi}
                isSelected={poi.id === selectedPoiId}
                isFavorite={favoriteIds.has(poi.id)}
                variant="compact"
                onSelect={onSelectPoi}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/80 to-transparent transition-opacity duration-200 dark:from-neutral-900/80",
          scrollState.atStart ? "opacity-0" : "opacity-100",
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/80 to-transparent transition-opacity duration-200 dark:from-neutral-900/80",
          scrollState.atEnd ? "opacity-0" : "opacity-100",
        )}
        aria-hidden="true"
      />
    </div>
  );
}
