import { Chord } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const GROUPS = ["payments", "checkout", "search", "growth", "platform"];
const FLOWS = [
  { from: "payments", to: "checkout", value: 38 },
  { from: "checkout", to: "payments", value: 22 },
  { from: "checkout", to: "search", value: 14 },
  { from: "search", to: "checkout", value: 9 },
  { from: "growth", to: "checkout", value: 18 },
  { from: "platform", to: "payments", value: 16 },
  { from: "platform", to: "search", value: 11 },
  { from: "payments", to: "platform", value: 8 },
  { from: "growth", to: "search", value: 7 },
  { from: "search", to: "growth", value: 4 },
];

export const glyph = (
  <Chord
    title="On-call handoffs"
    groups={GROUPS.slice(0, 4)}
    flows={FLOWS.slice(0, 5)}
  />
);

export const examples: DemoExample[] = [
  {
    title: "On-call handoffs, one quarter",
    setup:
      "Pages that left one rotation and landed on another. The circle is the point: these teams page each other.",
    read: "Payments into checkout is the thickest ribbon at 38, and the return carries 22. Growth sends 18 into checkout and seven into search. Platform sends 27 across payments and search and receives eight from payments.",
    source: "Incident handoffs, Q2 2025. n = 147.",
    chart: (
      <FigTooltip
        entries={{
          "payments → checkout": 38,
          "checkout → payments": 22,
          "checkout → search": 14,
          "search → checkout": 9,
          "growth → checkout": 18,
          "platform → payments": 16,
          "platform → search": 11,
          "payments → platform": 8,
          "growth → search": 7,
          "search → growth": 4,
        }}
      >
        <Chord
          aspect={1.15}
          title="On-call handoffs"
          groups={GROUPS}
          flows={FLOWS}
        />
      </FigTooltip>
    ),
  },
];
