import { Tree } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "A small org chart",
    note: "Position encodes reporting lines and nothing else; depth is the whole message.",
    chart: (
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
    ),
  },
  {
    title: "A project folder, two levels deep",
    note: "The filesystem is the original tree; every editor sidebar is this chart rotated.",
    chart: (
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
    ),
  },
  {
    title: "A language family, simplified",
    note: "Reconstruction as hierarchy: the proto-language at the root never appears in writing.",
    chart: (
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
    ),
  },
];
