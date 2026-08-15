import { Horizon } from "diagrammatic";

export function HorizonDemo() {
  return (
    <Horizon
      title="Server load across 24 hours"
      data={[
        2, 3.5, 5, 4.2, 6, 7.5, 6.2, 8, 9.5, 8.5, 7, 9, 6.5, 5, 6, 4.5, 3, 4,
      ]}
      bands={3}
      labels={["00", "06", "12", "18", "24"]}
    />
  );
}
