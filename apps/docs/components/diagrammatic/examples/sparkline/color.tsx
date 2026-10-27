import type { CSSProperties } from "react";
import { Sparkline } from "diagrammatic";

const DATA = [9, 8, 10, 7, 6, 7, 5, 4, 5, 3];

export default function SparklineColor() {
  return (
    <p className="text-sm">
      The line follows the text color{" "}
      <span className="text-red-600 dark:text-red-400">
        <Sparkline data={DATA} fill />
      </span>{" "}
      and the end dot and fill follow{" "}
      <span style={{ "--dg-c1": "#059669" } as CSSProperties}>
        <Sparkline data={DATA} fill />
      </span>{" "}
      the first categorical token.
    </p>
  );
}
