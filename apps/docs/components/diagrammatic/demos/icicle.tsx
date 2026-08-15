import { Icicle } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Monorepo size, level by level",
    setup:
      "A build engineer maps the repo before a caching overhaul: the icicle is a sunburst unrolled, widths still summing upward, but with labels that sit flat and legible.",
    read: "packages out-weighs apps, and inside it the react package alone is wider than the whole docs tree. Straight edges make sibling comparisons exact where the sunburst's arcs only suggest them.",
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
    setup:
      "A 420ms endpoint gets profiled, and the trace comes back as the icicle every profiler draws: the handler on top, its callees beneath, width equal to time.",
    read: "The db block is half the request, and inside it the query dwarfs serialization — the index to add is three levels down and one glance away. A flame graph is an icicle wearing profiler clothes; the reading skill transfers exactly.",
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
    setup:
      "The storage settings screen is a one-level bar; the icicle shows what it hides by giving media a second level of its own.",
    read: "Media splits into photos and video on the second level, and together they out-weigh every app installed. The 'messages' surprise — two gigabytes of received photos — is the kind of finding only the extra level surfaces.",
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
