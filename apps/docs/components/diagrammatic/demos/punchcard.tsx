import { Punchcard } from "diagrammatic";

const WEIGHT = [0.45, 0.85, 1, 0.9, 0.75, 0.5, 0.3];

export function PunchcardDemo() {
  return (
    <Punchcard
      title="Commits by weekday and hour"
      matrix={{
        rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        cols: ["0h", "", "", "6h", "", "", "12h", "", "", "18h", "", ""],
        values: WEIGHT.map((day, r) =>
          Array.from({ length: 12 }, (_, c) =>
            Math.max(
              0,
              day * Math.sin(((c + 0.5) / 12) * Math.PI) +
                0.12 * Math.sin(c * 2.1 + r),
            ),
          ),
        ),
      }}
    />
  );
}
