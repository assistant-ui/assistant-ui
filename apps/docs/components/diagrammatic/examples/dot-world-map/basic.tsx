import { DotWorldMap } from "diagrammatic/world";

export default function FootprintMap() {
  return (
    <DotWorldMap
      title="Where we ship"
      groups={{ shipping: ["US", "CA", "GB", "DE", "FR", "JP", "AU"] }}
    />
  );
}
