import { Tree } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Terminal } from "./scenes";

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
  {
    title: "A project folder, two levels deep",
    setup:
      "An onboarding doc opens with the repository's shape, because the filesystem is the original tree and every editor sidebar is this chart rotated ninety degrees.",
    read: "src splits into app and lib, tests mirror it — the structure telegraphs the testing culture before a single line is read. The lone api folder under docs is the part the new hire will ask about, which is exactly why the doc draws it.",
    chart: (
      <Terminal title="project tree">
        <Tree
          title="Project folder"
          root={{
            label: "project",
            children: [
              {
                label: "src",
                children: [{ label: "app" }, { label: "lib" }],
              },
              {
                label: "tests",
                children: [{ label: "unit" }, { label: "e2e" }],
              },
              { label: "docs", children: [{ label: "api" }] },
            ],
          }}
        />
      </Terminal>
    ),
  },
  {
    title: "A language family, simplified",
    setup:
      "A linguistics explainer draws descent as hierarchy: a reconstructed ancestor at the root, its daughters below, living languages at the leaves.",
    read: "The proto-language at the root never appears in writing — it exists only because the leaves demand a common parent, which is the whole method of historical linguistics in one node. Spanish and French are siblings; English and Greek are only distant cousins, and the tree states the distance in edges.",
    chart: (
      <Paper
        kicker="Linguistics"
        title="A family of languages"
        source="Source: comparative reconstruction"
      >
        <Tree
          title="Language family"
          root={{
            label: "proto",
            children: [
              {
                label: "romance",
                children: [{ label: "spanish" }, { label: "french" }],
              },
              {
                label: "germanic",
                children: [{ label: "english" }, { label: "dutch" }],
              },
              { label: "hellenic", children: [{ label: "greek" }] },
            ],
          }}
        />
      </Paper>
    ),
  },
];
