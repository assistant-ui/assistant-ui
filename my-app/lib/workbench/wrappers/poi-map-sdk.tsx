"use client";

import { useCallback, useMemo, useState } from "react";
import {
  POIMap,
  parseSerializablePOIMap,
  type POIMapViewState,
  type POICategory,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/components/examples/poi-map";
import {
  useWidgetState,
  useOpenAI,
  useDisplayMode,
  useRequestDisplayMode,
  useCallTool,
  useTheme,
  useOpenExternal,
  useSendFollowUpMessage,
  usePreviousDisplayMode,
} from "@/lib/workbench/openai-context";
import type { DisplayMode, View } from "@/lib/workbench/types";

const DEFAULT_WIDGET_STATE: POIMapViewState = {
  selectedPoiId: null,
  favoriteIds: [],
  mapCenter: DEFAULT_CENTER,
  mapZoom: DEFAULT_ZOOM,
  categoryFilter: null,
};

export function POIMapSDK(props: Record<string, unknown>) {
  const parsed = parseSerializablePOIMap(props);
  const { setWidgetState } = useOpenAI();
  const [widgetState] = useWidgetState<POIMapViewState>(DEFAULT_WIDGET_STATE);
  const displayMode = useDisplayMode();
  const previousDisplayMode = usePreviousDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const callTool = useCallTool();
  const theme = useTheme();
  const openExternal = useOpenExternal();
  const sendFollowUpMessage = useSendFollowUpMessage();
  const [localView, setLocalView] = useState<View | null>(null);

  const currentWidgetState = useMemo<POIMapViewState>(
    () => ({
      ...DEFAULT_WIDGET_STATE,
      mapCenter: parsed.initialCenter ?? DEFAULT_CENTER,
      mapZoom: parsed.initialZoom ?? DEFAULT_ZOOM,
      ...widgetState,
    }),
    [widgetState, parsed.initialCenter, parsed.initialZoom],
  );

  const handleWidgetStateChange = useCallback(
    (partialState: Partial<POIMapViewState>) => {
      setWidgetState({
        ...currentWidgetState,
        ...partialState,
      });
    },
    [setWidgetState, currentWidgetState],
  );

  const handleRequestDisplayMode = useCallback(
    async (mode: DisplayMode) => {
      await requestDisplayMode({ mode });
    },
    [requestDisplayMode],
  );

  const handleRefresh = useCallback(async () => {
    await callTool("refresh_pois", {
      center: currentWidgetState.mapCenter,
      zoom: currentWidgetState.mapZoom,
    });
  }, [callTool, currentWidgetState.mapCenter, currentWidgetState.mapZoom]);

  const handleToggleFavorite = useCallback(
    async (poiId: string, isFavorite: boolean) => {
      await callTool("toggle_favorite", {
        poi_id: poiId,
        is_favorite: isFavorite,
      });
    },
    [callTool],
  );

  const handleFilterCategory = useCallback(
    async (category: POICategory | null) => {
      await callTool("filter_pois", {
        category,
      });
    },
    [callTool],
  );

  const handleViewDetails = useCallback((poiId: string) => {
    setLocalView({
      mode: "modal",
      params: { poiId },
    });
  }, []);

  const handleDismissModal = useCallback(() => {
    setLocalView(null);
  }, []);

  const handleOpenExternal = useCallback(
    (url: string) => {
      openExternal({ href: url });
    },
    [openExternal],
  );

  const handleSendFollowUpMessage = useCallback(
    async (prompt: string) => {
      await sendFollowUpMessage({ prompt });
    },
    [sendFollowUpMessage],
  );

  return (
    <POIMap
      id={parsed.id}
      pois={parsed.pois}
      initialCenter={parsed.initialCenter}
      initialZoom={parsed.initialZoom}
      title={parsed.title}
      displayMode={displayMode}
      previousDisplayMode={previousDisplayMode ?? undefined}
      widgetState={currentWidgetState}
      theme={theme}
      view={localView}
      onWidgetStateChange={handleWidgetStateChange}
      onRequestDisplayMode={handleRequestDisplayMode}
      onRefresh={handleRefresh}
      onToggleFavorite={handleToggleFavorite}
      onFilterCategory={handleFilterCategory}
      onViewDetails={handleViewDetails}
      onDismissModal={handleDismissModal}
      onOpenExternal={handleOpenExternal}
      onSendFollowUpMessage={handleSendFollowUpMessage}
    />
  );
}
