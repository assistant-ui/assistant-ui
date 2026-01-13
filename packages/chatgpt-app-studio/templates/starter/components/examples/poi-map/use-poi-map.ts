"use client";

import { useMemo, useCallback } from "react";
import type { POI, POIMapViewState, MapCenter, POICategory } from "./schema";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "./schema";

interface UsePOIMapOptions {
  pois: POI[];
  widgetState: POIMapViewState | null;
  initialCenter?: MapCenter;
  initialZoom?: number;
  onWidgetStateChange: (state: Partial<POIMapViewState>) => void;
}

export function usePOIMap({
  pois,
  widgetState,
  initialCenter,
  initialZoom,
  onWidgetStateChange,
}: UsePOIMapOptions) {
  const selectedPoiId = widgetState?.selectedPoiId ?? null;
  const favoriteIds = useMemo(
    () => new Set(widgetState?.favoriteIds ?? []),
    [widgetState?.favoriteIds],
  );
  const mapCenter = widgetState?.mapCenter ?? initialCenter ?? DEFAULT_CENTER;
  const mapZoom = widgetState?.mapZoom ?? initialZoom ?? DEFAULT_ZOOM;
  const categoryFilter = widgetState?.categoryFilter ?? null;

  const selectedPoi = useMemo(
    () => pois.find((p) => p.id === selectedPoiId) ?? null,
    [pois, selectedPoiId],
  );

  const filteredPois = useMemo(() => {
    if (!categoryFilter) return pois;
    return pois.filter((p) => p.category === categoryFilter);
  }, [pois, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set<POICategory>();
    pois.forEach((p) => cats.add(p.category));
    return Array.from(cats).sort();
  }, [pois]);

  const selectPoi = useCallback(
    (poiId: string | null) => {
      onWidgetStateChange({ selectedPoiId: poiId });
    },
    [onWidgetStateChange],
  );

  const toggleFavorite = useCallback(
    (poiId: string) => {
      const currentFavorites = widgetState?.favoriteIds ?? [];
      const newFavorites = currentFavorites.includes(poiId)
        ? currentFavorites.filter((id) => id !== poiId)
        : [...currentFavorites, poiId];
      onWidgetStateChange({ favoriteIds: newFavorites });
    },
    [widgetState?.favoriteIds, onWidgetStateChange],
  );

  const setMapViewport = useCallback(
    (center: MapCenter, zoom: number) => {
      onWidgetStateChange({ mapCenter: center, mapZoom: zoom });
    },
    [onWidgetStateChange],
  );

  const setCategoryFilter = useCallback(
    (category: POICategory | null) => {
      onWidgetStateChange({ categoryFilter: category });
    },
    [onWidgetStateChange],
  );

  return {
    selectedPoiId,
    selectedPoi,
    favoriteIds,
    mapCenter,
    mapZoom,
    categoryFilter,
    filteredPois,
    categories,
    selectPoi,
    toggleFavorite,
    setMapViewport,
    setCategoryFilter,
  };
}
