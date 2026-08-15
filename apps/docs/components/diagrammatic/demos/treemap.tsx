import { Treemap } from "diagrammatic";

export function TreemapDemo() {
  return (
    <Treemap
      title="Disk usage by directory"
      root={{
        label: "repo",
        children: [
          { label: "node_modules", value: 2.1 },
          {
            label: "src",
            children: [
              { label: "app", value: 0.5 },
              { label: "assets", value: 0.34 },
            ],
          },
          {
            label: "dist",
            children: [
              { label: "js", value: 0.38 },
              { label: ".git", value: 0.28 },
            ],
          },
          { label: "cache", value: 0.2 },
        ],
      }}
      format={(v) => `${v} GB`}
    />
  );
}
