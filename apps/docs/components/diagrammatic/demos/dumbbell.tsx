import { Dumbbell } from "diagrammatic";

export function DumbbellDemo() {
  return (
    <Dumbbell
      title="Page load score, before and after"
      items={[
        { label: "home", from: 38, to: 84 },
        { label: "search", from: 52, to: 76 },
        { label: "checkout", from: 66, to: 58 },
        { label: "profile", from: 30, to: 54 },
        { label: "api docs", from: 44, to: 92 },
      ]}
      fromLabel="before"
      toLabel="after"
    />
  );
}
