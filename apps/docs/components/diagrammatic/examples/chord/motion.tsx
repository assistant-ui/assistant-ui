import { Chord } from "diagrammatic";

export default function HandoffChord() {
  return (
    <div data-dg-motion="">
      <Chord
        aspect={1.15}
        title="On-call handoffs between teams"
        groups={["payments", "checkout", "search", "growth", "platform"]}
        flows={[
          { from: "payments", to: "checkout", value: 38 },
          { from: "checkout", to: "payments", value: 22 },
          { from: "checkout", to: "search", value: 14 },
          { from: "growth", to: "checkout", value: 18 },
          { from: "platform", to: "payments", value: 16 },
          { from: "platform", to: "search", value: 11 },
        ]}
      />
    </div>
  );
}
