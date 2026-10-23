import { WorldMap } from "diagrammatic/world";

const YEARS = [
  { year: 2024, values: { US: 280, GB: 90, DE: 110, IN: 60, JP: 70, BR: 30 } },
  {
    year: 2025,
    values: { US: 412, GB: 160, DE: 198, IN: 231, JP: 141, BR: 96 },
  },
];

export default function YearOverYearMaps() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {YEARS.map(({ year, values }) => (
        <figure key={year}>
          <figcaption className="mb-1 text-xs font-medium">{year}</figcaption>
          <WorldMap
            title={`Active workspaces, ${year}`}
            values={values}
            max={412}
            width={320}
          />
        </figure>
      ))}
    </div>
  );
}
