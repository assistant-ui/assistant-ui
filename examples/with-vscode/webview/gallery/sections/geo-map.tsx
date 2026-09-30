import { useState } from "react";
import {
  GeoMap,
  type GeoMapPlace,
  type GeoMapRoute,
} from "@assistant-ui/ui/components/assistant-ui/elements/geo-map.tsx";
import { defineSections } from "../types";

const PLACES: readonly GeoMapPlace[] = [
  {
    id: "library",
    lat: 1.2966,
    lng: 103.7764,
    label: "Central Library",
    description: "A calm place to begin.",
  },
  {
    id: "museum",
    lat: 1.2974,
    lng: 103.776,
    label: "University Museum",
    description: "Five minutes across the lawn.",
  },
  {
    id: "garden",
    lat: 1.2955,
    lng: 103.7783,
    label: "Botanic Garden gate",
    description: "The route finishes here.",
  },
];

const ROUTES: readonly GeoMapRoute[] = [
  {
    id: "library-to-museum",
    label: "Library walk",
    points: [
      [1.2966, 103.7764],
      [1.2974, 103.776],
    ],
  },
];

function PlaceMap() {
  const [selectedId, setSelectedId] = useState("library");
  return (
    <GeoMap
      places={PLACES}
      routes={ROUTES}
      selectedId={selectedId}
      onSelect={setSelectedId}
      height={220}
    />
  );
}

export default defineSections([
  {
    id: "geo-map",
    title: "Geo map (Leaflet)",
    category: "content",
    notes:
      "Leaflet with OpenStreetMap tiles over https: (img-src allows https:), three places and a route.",
    render: () => <PlaceMap />,
  },
]);
