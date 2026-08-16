import { Tree } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <Tree
    title="A small org chart"
    root={{
      label: "ceo",
      children: [
        {
          label: "eng",
          children: [{ label: "platform" }, { label: "product" }],
        },
        { label: "design", children: [{ label: "brand" }] },
        {
          label: "gtm",
          children: [{ label: "sales" }, { label: "marketing" }],
        },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "A small org chart",
    setup:
      "A hiring page shows the company's shape before candidates ask. Position encodes reporting lines and nothing else — no sizes, no metrics, just who answers to whom.",
    read: "Three branches, two levels, done: depth is the whole message. Design's single report says 'early'; gtm's symmetric pair says 'built to a plan'. Org charts confess more than the about page intends.",
    chart: (
      <AppCard title="The org, level two" meta="hiring page">
        <Tree
          title="A small org chart"
          root={{
            label: "ceo",
            children: [
              {
                label: "eng",
                children: [{ label: "platform" }, { label: "product" }],
              },
              { label: "design", children: [{ label: "brand" }] },
              {
                label: "gtm",
                children: [{ label: "sales" }, { label: "marketing" }],
              },
            ],
          }}
        />
      </AppCard>
    ),
  },
];
