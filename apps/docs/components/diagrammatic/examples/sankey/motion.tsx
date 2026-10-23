import { Sankey } from "diagrammatic";

export default function SignupFlowSankey() {
  return (
    <div data-dg-motion="">
      <Sankey
        title="Where this week's signups came from and went"
        labels={["source", "first action", "outcome"]}
        graph={{
          nodes: [
            { id: "search", group: 0 },
            { id: "docs", group: 0 },
            { id: "referral", group: 0 },
            { id: "template", group: 1 },
            { id: "blank", group: 1 },
            { id: "activated", group: 2 },
            { id: "dropped", group: 2 },
          ],
          links: [
            { source: "search", target: "template", value: 420 },
            { source: "search", target: "blank", value: 180 },
            { source: "docs", target: "template", value: 260 },
            { source: "docs", target: "blank", value: 140 },
            { source: "referral", target: "template", value: 120 },
            { source: "template", target: "activated", value: 610 },
            { source: "template", target: "dropped", value: 190 },
            { source: "blank", target: "activated", value: 110 },
            { source: "blank", target: "dropped", value: 210 },
          ],
        }}
      />
    </div>
  );
}
