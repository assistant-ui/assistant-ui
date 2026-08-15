import { Marimekko } from "diagrammatic";

export function MarimekkoDemo() {
  return (
    <Marimekko
      title="Market by region and vendor"
      columns={[
        {
          label: "AMER",
          width: 62,
          shares: [
            { label: "north", value: 50 },
            { label: "acme", value: 30 },
            { label: "other", value: 20 },
          ],
        },
        {
          label: "EMEA",
          width: 48,
          shares: [
            { label: "north", value: 35 },
            { label: "acme", value: 42 },
            { label: "other", value: 23 },
          ],
        },
        {
          label: "APAC",
          width: 40,
          shares: [
            { label: "north", value: 55 },
            { label: "acme", value: 20 },
            { label: "other", value: 25 },
          ],
        },
        {
          label: "LATAM",
          width: 28,
          shares: [
            { label: "north", value: 28 },
            { label: "acme", value: 50 },
            { label: "other", value: 22 },
          ],
        },
      ]}
    />
  );
}
