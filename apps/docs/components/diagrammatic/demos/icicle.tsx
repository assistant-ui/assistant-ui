import { Icicle } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Monorepo size, level by level",
    note: "A sunburst unrolled: widths still sum upward, but labels sit flat.",
    chart: (
      <Icicle
        title="Monorepo size"
        root={{
          label: "repo · 4.2 GB",
          children: [
            {
              label: "packages",
              children: [
                { label: "react", value: 50 },
                { label: "core", value: 32 },
              ],
            },
            {
              label: "apps",
              children: [
                { label: "web", value: 34 },
                { label: "docs", value: 22 },
              ],
            },
            { label: "docs", value: 36 },
          ],
        }}
      />
    ),
  },
  {
    title: "Where a slow request spends its time",
    note: "A flame graph is an icicle wearing profiler clothes; the db row is the one to fix.",
    chart: (
      <Icicle
        title="Request time by call"
        root={{
          label: "handler · 420ms",
          children: [
            {
              label: "db",
              children: [
                { label: "query", value: 48 },
                { label: "serialize", value: 14 },
              ],
            },
            {
              label: "render",
              children: [
                { label: "template", value: 20 },
                { label: "markdown", value: 10 },
              ],
            },
            { label: "auth", value: 8 },
          ],
        }}
      />
    ),
  },
  {
    title: "A phone's storage, unpacked",
    note: "Media splits into its parts on the second level; messages hide two gigabytes of photos.",
    chart: (
      <Icicle
        title="Phone storage"
        root={{
          label: "128 GB",
          children: [
            {
              label: "media",
              children: [
                { label: "photos", value: 38 },
                { label: "video", value: 26 },
              ],
            },
            {
              label: "apps",
              children: [
                { label: "games", value: 20 },
                { label: "social", value: 12 },
              ],
            },
            { label: "system", value: 18 },
          ],
        }}
      />
    ),
  },
];
