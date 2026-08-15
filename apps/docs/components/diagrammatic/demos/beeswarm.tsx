import { Beeswarm } from "diagrammatic";

export function BeeswarmDemo() {
  return (
    <Beeswarm
      title="PR review latency"
      values={[
        2, 3, 3.5, 4, 4.2, 4.4, 5, 5.2, 5.5, 6, 6.2, 6.5, 7, 7.2, 7.4, 8, 8.5,
        9, 10, 11, 12, 14, 16, 20, 24, 48,
      ]}
      flag={{ at: 48, label: "48h" }}
      labels={["0h", "12h", "24h", "36h", "48h"]}
    />
  );
}
