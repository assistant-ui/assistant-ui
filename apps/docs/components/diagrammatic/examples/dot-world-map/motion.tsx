import { DotWorldMap } from "diagrammatic/world";

export default function LiveTrafficMap() {
  return (
    <div data-dg-motion="">
      <DotWorldMap
        title="Traffic failing over between regions, live"
        groups={{
          "us-east": ["US", "CA", "MX", "BR"],
          "eu-west": ["GB", "FR", "DE", "ES", "IT"],
          "ap-south": ["IN", "SG", "JP", "AU"],
        }}
        flows={[
          { from: "BR", to: "US" },
          { from: "GB", to: "US" },
          { from: "IN", to: "DE" },
          { from: "AU", to: "SG" },
          { from: "JP", to: "US" },
          { from: "DE", to: "SG" },
        ]}
      />
    </div>
  );
}
