import { Tree } from "diagrammatic";

export function TreeDemo() {
  return (
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
}
