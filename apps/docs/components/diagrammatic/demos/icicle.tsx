import { Icicle } from "diagrammatic";

export function IcicleDemo() {
  return (
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
  );
}
