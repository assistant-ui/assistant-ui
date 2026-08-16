import { Icicle } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const ROOT = {
  label: "checkout · 4.82s",
  children: [
    {
      label: "db · 2.26s",
      children: [
        { label: "inventory", value: 1.12 },
        { label: "pricing", value: 0.64 },
        { label: "pool wait", value: 0.32 },
        { label: "serialize", value: 0.18 },
      ],
    },
    {
      label: "payments · 1.48s",
      children: [
        { label: "authorize", value: 0.92 },
        { label: "3ds", value: 0.38 },
        { label: "retry", value: 0.18 },
      ],
    },
    {
      label: "render · 0.74s",
      children: [
        { label: "template", value: 0.41 },
        { label: "partials", value: 0.21 },
        { label: "json", value: 0.12 },
      ],
    },
    {
      label: "auth · 0.34s",
      children: [
        { label: "session", value: 0.21 },
        { label: "token", value: 0.13 },
      ],
    },
  ],
};

export const glyph = (
  <Icicle
    title="Request time"
    root={{
      label: "handler",
      children: [
        {
          label: "db",
          children: [
            { label: "query", value: 38 },
            { label: "pool", value: 6 },
          ],
        },
        {
          label: "render",
          children: [
            { label: "template", value: 16 },
            { label: "json", value: 8 },
          ],
        },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Where a 4.82s checkout spends time",
    setup:
      "A p95 checkout gets profiled. The icicle is the flame graph without the fire: handler on top, callees beneath, width equal to time.",
    read: "Database is 2.26s, and inventory is half of that. Payments is the second slab, almost all authorize. Render and auth together do not match the inventory query. The index to add is three levels down.",
    source: "p95 checkout POST, 14 Aug 2025, traced for 20 minutes.",
    chart: (
      <FigTooltip
        entries={{
          inventory: "1.12s",
          pricing: "0.64s",
          "pool wait": "0.32s",
          serialize: "0.18s",
          authorize: "0.92s",
          "3ds": "0.38s",
          retry: "0.18s",
          template: "0.41s",
          partials: "0.21s",
          json: "0.12s",
          session: "0.21s",
          token: "0.13s",
        }}
      >
        <Icicle
          density="figure"
          aspect={1.7}
          title="Checkout p95 by call"
          depth={2}
          root={ROOT}
        />
      </FigTooltip>
    ),
  },
];
