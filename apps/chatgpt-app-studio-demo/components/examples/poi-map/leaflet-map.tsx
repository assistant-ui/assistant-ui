"use client";

import { useEffect, useRef, useMemo, memo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { POI, MapCenter, POICategory } from "./schema";
import { CATEGORY_COLORS, type MapViewProps } from "./map-view";
import { cn } from "./_adapter";

function createMarkerIcon(
  category: POICategory,
  isSelected: boolean,
  isFavorite: boolean,
): L.DivIcon {
  const color = CATEGORY_COLORS[category];
  const outerSize = 44;
  const innerSize = isSelected ? 24 : 18;
  const borderWidth = isSelected ? 2.5 : 2;

  const shadow = isSelected
    ? `0 0 0 4px ${color}33, 0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)`
    : "0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)";

  return L.divIcon({
    className: "custom-marker",
    iconSize: [outerSize, outerSize],
    iconAnchor: [outerSize / 2, outerSize / 2],
    popupAnchor: [0, -innerSize / 2],
    html: `
      <div style="
        width: ${outerSize}px;
        height: ${outerSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="
          width: ${innerSize}px;
          height: ${innerSize}px;
          background: ${color};
          border: ${borderWidth}px solid white;
          border-radius: 50%;
          box-shadow: ${shadow};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
          transform: scale(${isSelected ? 1 : 1});
        "
        onmouseenter="this.style.transform='scale(1.15)'"
        onmouseleave="this.style.transform='scale(1)'"
        >
          ${isFavorite ? `<span style="color: white; font-size: ${innerSize * 0.5}px; line-height: 1; margin-top: -1px;">★</span>` : ""}
        </div>
      </div>
    `,
  });
}

interface MapEventsProps {
  onMoveEnd?: (center: MapCenter, zoom: number) => void;
}

function MapEvents({ onMoveEnd }: MapEventsProps) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const center = map.getCenter();
      onMoveEnd?.({ lat: center.lat, lng: center.lng }, map.getZoom());
    },
  });
  return null;
}

interface MapControllerProps {
  selectedPoiId: string | null;
  pois: POI[];
}

function MapController({ selectedPoiId, pois }: MapControllerProps) {
  const map = useMap();
  const prevSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedPoiId && selectedPoiId !== prevSelectedIdRef.current) {
      const poi = pois.find((p) => p.id === selectedPoiId);
      if (poi) {
        map.flyTo([poi.lat, poi.lng], Math.max(map.getZoom(), 14), {
          duration: 0.5,
        });
      }
    }
    prevSelectedIdRef.current = selectedPoiId;
  }, [selectedPoiId, pois, map]);

  return null;
}

interface POIMarkerProps {
  poi: POI;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (id: string) => void;
}

const POIMarker = memo(function POIMarker({
  poi,
  isSelected,
  isFavorite,
  onSelect,
}: POIMarkerProps) {
  const icon = useMemo(
    () => createMarkerIcon(poi.category, isSelected, isFavorite),
    [poi.category, isSelected, isFavorite],
  );

  const eventHandlers = useMemo(
    () => ({
      click: () => onSelect(poi.id),
    }),
    [poi.id, onSelect],
  );

  return (
    <Marker
      position={[poi.lat, poi.lng]}
      icon={icon}
      eventHandlers={eventHandlers}
      title={poi.name}
    />
  );
});

export default function LeafletMap({
  pois,
  center,
  zoom,
  selectedPoiId,
  favoriteIds,
  onSelectPoi,
  onMoveEnd,
  theme = "light",
  className,
}: MapViewProps) {
  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div className={cn("relative h-full w-full", className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <MapEvents onMoveEnd={onMoveEnd} />
        <MapController selectedPoiId={selectedPoiId} pois={pois} />
        {pois.map((poi) => (
          <POIMarker
            key={poi.id}
            poi={poi}
            isSelected={poi.id === selectedPoiId}
            isFavorite={favoriteIds.has(poi.id)}
            onSelect={onSelectPoi}
          />
        ))}
      </MapContainer>
    </div>
  );
}
