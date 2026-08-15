import { Pictogram } from "diagrammatic";

export function PictogramDemo() {
  return (
    <Pictogram
      title="Headcount by office"
      items={[
        { label: "berlin", value: 85 },
        { label: "tokyo", value: 60 },
        { label: "austin", value: 35 },
      ]}
      unit={10}
      unitLabel="people"
    />
  );
}
