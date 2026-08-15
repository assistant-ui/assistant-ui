import { Dendrogram } from "diagrammatic";

export function DendrogramDemo() {
  return (
    <Dendrogram
      title="Support tickets clustered by topic"
      leaves={[
        "login",
        "2fa",
        "billing",
        "refund",
        "export",
        "api",
        "mobile",
        "other",
      ]}
      merges={[
        { a: 0, b: 1, height: 1 },
        { a: 2, b: 3, height: 1.4 },
        { a: 8, b: 9, height: 2.2 },
        { a: 4, b: 5, height: 1.6 },
        { a: 6, b: 7, height: 1.2 },
        { a: 11, b: 12, height: 2.6 },
        { a: 10, b: 13, height: 3.2 },
      ]}
      highlight={0}
    />
  );
}
