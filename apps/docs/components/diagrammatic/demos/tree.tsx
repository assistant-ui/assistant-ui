import { Tree } from "diagrammatic";
import type { DemoExample } from "./types";

const ROOT = {
  label: "eng",
  children: [
    {
      label: "platform",
      children: [
        { label: "runtime" },
        { label: "data" },
        { label: "security" },
      ],
    },
    {
      label: "product",
      children: [
        { label: "checkout" },
        { label: "search" },
        { label: "growth" },
      ],
    },
    {
      label: "mobile",
      children: [{ label: "ios" }, { label: "android" }],
    },
    {
      label: "infra",
      children: [{ label: "sre" }, { label: "net" }],
    },
  ],
};

export const glyph = (
  <Tree
    title="Engineering"
    root={{
      label: "eng",
      children: [
        { label: "platform", children: [{ label: "runtime" }] },
        { label: "product", children: [{ label: "checkout" }] },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Engineering after the July reorg",
    setup: "Who reports to whom. No sizes. The tree is the org, not a metric.",
    read: "Product and platform now match at three teams. Mobile is still a pair. Infra is two names that used to be one on-call. The missing design branch is the other memo.",
    source: "People directory, 1 Aug 2025.",
    chart: (
      <Tree
        density="figure"
        aspect={1.35}
        title="Engineering"
        depth={2}
        root={ROOT}
      />
    ),
  },
];
