"use client";

import { useState } from "react";
import {
  MapAnswer,
  type MapPin,
} from "@/components/assistant-ui/elements/map-answer";

const PINS: readonly MapPin[] = [
  { id: "a", label: "Ferry Building", detail: "start", x: 22, y: 68 },
  { id: "b", label: "Salesforce Park", detail: "8 min", x: 48, y: 44 },
  { id: "c", label: "Yerba Buena Gardens", detail: "14 min", x: 74, y: 26 },
];

export function MapAnswerDemo() {
  const [activeId, setActiveId] = useState("b");

  return (
    <MapAnswer pins={PINS} activeId={activeId} route onSelect={setActiveId} />
  );
}
