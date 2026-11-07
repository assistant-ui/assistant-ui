"use client";

import {
  GeoMap,
  type GeoMapPlace,
} from "@/components/assistant-ui/elements/geo-map";
import { defineStates } from "./types";

const noop = () => {};

const LIBRARY: GeoMapPlace = {
  id: "library",
  lat: 1.2966,
  lng: 103.7764,
  label: "Central Library",
  description: "A calm place to begin.",
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "single",
    label: "One place",
    note: "A single place centers the map at street zoom.",
    Component: () => (
      <GeoMap
        places={[LIBRARY]}
        selectedId="library"
        onSelect={noop}
        height={170}
      />
    ),
  },
  {
    key: "empty",
    label: "No places",
    note: "Nothing to plot, so the map falls back to a world view and the list is empty.",
    Component: () => <GeoMap places={[]} height={170} />,
  },
  {
    key: "invalid-coordinates",
    label: "Bad coordinates",
    note: "A place with out-of-range coordinates is dropped from the map and the list.",
    Component: () => (
      <GeoMap
        places={[
          LIBRARY,
          {
            id: "museum",
            lat: 1.2974,
            lng: 103.776,
            label: "University Museum",
            description: "Five minutes across the lawn.",
          },
          {
            id: "garden",
            lat: 103.7783,
            lng: 1.2955,
            label: "Botanic Garden gate",
            description: "Latitude and longitude were swapped upstream.",
          },
        ]}
        selectedId="library"
        onSelect={noop}
        height={170}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long route",
    note: "A multi-city route with long names that wrap in the list.",
    Component: () => (
      <GeoMap
        places={[
          {
            id: "lisbon",
            lat: 38.7223,
            lng: -9.1393,
            label: "Lisbon, Praça do Comércio waterfront",
            description:
              "Day 1. Pick up the rental car at the Santa Apolónia station lot.",
          },
          {
            id: "porto",
            lat: 41.1579,
            lng: -8.6291,
            label: "Porto, Ribeira district",
            description: "Day 3. Three hours north on the A1.",
          },
          {
            id: "santiago",
            lat: 42.8782,
            lng: -8.5448,
            label: "Santiago de Compostela, Praza do Obradoiro",
            description: "Day 5. Return the car at the airport before 18:00.",
          },
        ]}
        routes={[
          {
            id: "coast",
            label: "Coastal drive",
            points: [
              [38.7223, -9.1393],
              [41.1579, -8.6291],
              [42.8782, -8.5448],
            ],
          },
        ]}
        selectedId="porto"
        onSelect={noop}
        height={220}
      />
    ),
  },
]);
