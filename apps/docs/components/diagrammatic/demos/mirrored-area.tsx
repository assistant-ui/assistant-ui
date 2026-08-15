import { MirroredArea } from "diagrammatic";

export function MirroredAreaDemo() {
  return (
    <MirroredArea
      title="Router throughput over one day"
      down={{ name: "download", data: [18, 30, 26, 40, 36, 48, 42, 52] }}
      up={{ name: "upload", data: [8, 12, 10, 16, 14, 18, 22, 16] }}
      labels={["00", "03", "06", "09", "12", "15", "18", "21"]}
    />
  );
}
