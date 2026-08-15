import { Chord } from "diagrammatic";

export function ChordDemo() {
  return (
    <Chord
      title="Trade flows between regions"
      groups={["americas", "europe", "asia", "africa"]}
      flows={[
        { from: "americas", to: "asia", value: 30 },
        { from: "americas", to: "europe", value: 18 },
        { from: "europe", to: "africa", value: 14 },
        { from: "asia", to: "africa", value: 8 },
      ]}
    />
  );
}
