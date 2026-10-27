import { DotWorldMap } from "diagrammatic/world";

export default function ReplicationMap() {
  return (
    <DotWorldMap
      title="Database replication from the primary in Virginia"
      groups={{
        primary: ["US"],
        replicas: ["GB", "DE", "JP", "SG", "BR", "AU"],
      }}
      flows={["GB", "DE", "JP", "SG", "BR", "AU"].map((to) => ({
        from: "US",
        to,
      }))}
    />
  );
}
