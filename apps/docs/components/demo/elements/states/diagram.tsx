"use client";

import { Diagram } from "@/components/assistant-ui/elements/diagram";
import { defineStates } from "./types";

const noop = () => {};

const BOXES = [
  { label: "composer", x: 8, y: 10 },
  { label: "runtime", x: 108, y: 10 },
  { label: "adapter", x: 208, y: 10 },
  { label: "provider", x: 158, y: 74 },
];

function MessageFlow() {
  return (
    <svg viewBox="0 0 292 116" className="h-[116px] w-[292px]">
      <path
        d="M 88 26 L 108 26 M 188 26 L 208 26 M 248 42 L 248 74 L 218 90"
        className="stroke-foreground/25"
        strokeWidth="1.5"
        fill="none"
      />
      {BOXES.map((box) => (
        <g key={box.label}>
          <rect
            x={box.x}
            y={box.y}
            width="80"
            height="32"
            rx="8"
            className="fill-foreground/[0.05] stroke-foreground/15"
            strokeWidth="1"
          />
          <text
            x={box.x + 40}
            y={box.y + 20}
            textAnchor="middle"
            className="fill-foreground/70 font-mono text-[10px]"
          >
            {box.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const handlers = {
  onZoomIn: noop,
  onZoomOut: noop,
  onReset: noop,
  onExpand: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "zoomed-in",
    label: "Zoomed in",
    note: "At 160% the drawing is larger than the frame and clips at the edges.",
    Component: () => (
      <Diagram title="message flow" zoom={1.6} {...handlers}>
        <MessageFlow />
      </Diagram>
    ),
  },
  {
    key: "zoomed-out",
    label: "Zoomed out",
    note: "At 60% the whole drawing sits small inside the frame.",
    Component: () => (
      <Diagram title="message flow" zoom={0.6} {...handlers}>
        <MessageFlow />
      </Diagram>
    ),
  },
  {
    key: "no-expand",
    label: "No full screen",
    note: "Without an expand handler the full screen button is disabled.",
    Component: () => (
      <Diagram
        title="message flow"
        zoom={1}
        onZoomIn={noop}
        onZoomOut={noop}
        onReset={noop}
      >
        <MessageFlow />
      </Diagram>
    ),
  },
  {
    key: "long-content",
    label: "Long title",
    note: "A long title truncates before the zoom controls.",
    Component: () => (
      <Diagram
        title="message flow from the composer through the runtime and adapter to the model provider"
        zoom={1}
        {...handlers}
      >
        <MessageFlow />
      </Diagram>
    ),
  },
]);
