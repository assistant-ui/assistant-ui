"use client";

import { renderGenerativeUI } from "@assistant-ui/generative-ui/react";
import type { UISpec } from "@assistant-ui/generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";
import { defineStates } from "./types";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-aui-theme="elements"
      className="aui-gallery w-full max-w-sm origin-center scale-[0.85]"
    >
      {children}
    </div>
  );
}

const STREAMING: UISpec = {
  $type: "Card",
  children: [
    {
      $type: "Row",
      $key: "header",
      justify: "between",
      align: "center",
      children: [
        {
          $type: "Text",
          $key: "city",
          value: "Austin, TX",
          color: "secondary",
        },
      ],
    },
    { $type: "Text", $key: "temp", value: "9", size: "3xl", weight: "bold" },
  ],
};

const MARKDOWN: UISpec = {
  $type: "Card",
  children: [
    {
      $type: "Markdown",
      $key: "notes",
      value: [
        "**Standup, Tuesday**",
        "",
        "- Search reindex finished overnight",
        "- `billing-worker` retries are back under 1%",
        "- Mobile release moves to **Thursday**",
        "",
        "Notes are in the [team doc](https://example.com/standup).",
      ].join("\n"),
    },
  ],
};

const DIAGRAM: UISpec = {
  $type: "Card",
  children: [
    {
      $type: "Diagram",
      $key: "flow",
      title: "Refund approval",
      code: `graph TD
    A[Refund request] --> B{Over $500?}
    B -->|No| C[Auto approve]
    B -->|Yes| D[Manager review]`,
    },
  ],
};

const MAP: UISpec = {
  $type: "Card",
  children: [
    {
      $type: "Map",
      $key: "trip",
      route: true,
      places: [
        { label: "Lisbon", lat: 38.7223, lng: -9.1393, detail: "Day 1 to 3" },
        { label: "Porto", lat: 41.1579, lng: -8.6291, detail: "Day 4 to 5" },
        { label: "Madrid", lat: 40.4168, lng: -3.7038, detail: "Day 6 to 8" },
      ],
    },
  ],
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "The spec is still arriving, so only the finished nodes and partial text show.",
    Component: () => (
      <Frame>
        {renderGenerativeUI(STREAMING, styledGenerativeUILibrary, {
          status: "streaming",
        })}
      </Frame>
    ),
  },
  {
    key: "markdown",
    label: "Markdown",
    note: "A markdown node renders as GitHub-flavored markdown inside the card.",
    Component: () => (
      <Frame>{renderGenerativeUI(MARKDOWN, styledGenerativeUILibrary)}</Frame>
    ),
  },
  {
    key: "diagram",
    label: "Diagram",
    note: "A diagram node draws its Mermaid source with a caption.",
    Component: () => (
      <Frame>{renderGenerativeUI(DIAGRAM, styledGenerativeUILibrary)}</Frame>
    ),
  },
  {
    key: "map",
    label: "Map",
    note: "A map node pins each place and draws the route between them.",
    Component: () => (
      <Frame>{renderGenerativeUI(MAP, styledGenerativeUILibrary)}</Frame>
    ),
  },
]);
