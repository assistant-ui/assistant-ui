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
    title: "Engineering team structure",
    setup: "Who reports to whom. No sizes. The tree is the org, not a metric.",
    read: "Product and platform each have three teams. Mobile and infra each have two. The engineering root therefore has four branches and ten leaf teams.",
    source: "Illustrative engineering team directory.",
    chart: <Tree aspect={1.35} title="Engineering" depth={2} root={ROOT} />,
  },
];
