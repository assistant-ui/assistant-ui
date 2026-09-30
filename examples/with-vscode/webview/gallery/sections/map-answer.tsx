import { useState } from "react";
import {
  MapAnswer,
  type MapPin,
} from "@assistant-ui/ui/components/assistant-ui/elements/map-answer.tsx";
import { defineSections } from "../types";

const PINS: readonly MapPin[] = [
  { id: "a", label: "Ferry Building", detail: "start", x: 22, y: 68 },
  { id: "b", label: "Salesforce Park", detail: "8 min", x: 48, y: 44 },
  { id: "c", label: "Yerba Buena Gardens", detail: "14 min", x: 74, y: 26 },
];

function Answer() {
  const [activeId, setActiveId] = useState("b");
  return (
    <MapAnswer pins={PINS} activeId={activeId} route onSelect={setActiveId} />
  );
}

export default defineSections([
  {
    id: "map-answer",
    title: "Map answer",
    category: "content",
    notes:
      "Tile-free schematic map with three pins and a route; the middle pin is active.",
    render: () => <Answer />,
  },
]);
