"use client";

import {
  MapAnswer,
  type MapPin,
} from "@/components/assistant-ui/elements/map-answer";
import { defineStates } from "./types";

const noop = () => {};

const PINS: readonly MapPin[] = [
  { id: "a", label: "Ferry Building", detail: "start", x: 22, y: 68 },
  { id: "b", label: "Salesforce Park", detail: "8 min", x: 48, y: 44 },
  { id: "c", label: "Yerba Buena Gardens", detail: "14 min", x: 74, y: 26 },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "single",
    label: "One place",
    note: "A single location answer with no route to draw.",
    Component: () => (
      <MapAnswer
        pins={[
          {
            id: "a",
            label: "Tartine Bakery",
            detail: "0.4 mi",
            x: 50,
            y: 52,
          },
        ]}
        activeId="a"
        route
        onSelect={noop}
      />
    ),
  },
  {
    key: "no-route",
    label: "No route",
    note: "Several places listed as options, with no route between them.",
    Component: () => (
      <MapAnswer
        pins={[
          {
            id: "a",
            label: "Blue Bottle Coffee",
            detail: "0.2 mi",
            x: 30,
            y: 36,
          },
          {
            id: "b",
            label: "Sightglass Coffee",
            detail: "0.6 mi",
            x: 62,
            y: 58,
          },
          { id: "c", label: "Ritual Coffee", detail: "1.1 mi", x: 80, y: 22 },
        ]}
        activeId="a"
        onSelect={noop}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a select handler the pins and rows cannot be picked.",
    Component: () => <MapAnswer pins={PINS} activeId="a" route />,
  },
  {
    key: "long-content",
    label: "Many stops",
    note: "A longer route where long names truncate beside their times.",
    Component: () => (
      <MapAnswer
        pins={[
          {
            id: "a",
            label: "Ferry Building Marketplace",
            detail: "start",
            x: 12,
            y: 80,
          },
          {
            id: "b",
            label: "Salesforce Transit Center Rooftop Park",
            detail: "8 min",
            x: 34,
            y: 58,
          },
          {
            id: "c",
            label: "Yerba Buena Gardens",
            detail: "14 min",
            x: 52,
            y: 40,
          },
          {
            id: "d",
            label: "San Francisco Museum of Modern Art",
            detail: "17 min",
            x: 66,
            y: 30,
          },
          {
            id: "e",
            label: "Oracle Park, China Basin waterfront entrance",
            detail: "31 min",
            x: 88,
            y: 14,
          },
        ]}
        activeId="d"
        route
        onSelect={noop}
      />
    ),
  },
]);
