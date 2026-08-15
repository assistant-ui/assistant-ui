import { Venn } from "diagrammatic";

export function VennDemo() {
  return (
    <Venn
      title="Web and app users"
      a={{ label: "web only", value: 4200 }}
      b={{ label: "app only", value: 3100 }}
      overlap={1300}
    />
  );
}
