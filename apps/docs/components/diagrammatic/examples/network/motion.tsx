import { Network } from "diagrammatic";

export default function RequestPathNetwork() {
  return (
    <div data-dg-motion="">
      <Network
        aspect={1.2}
        title="Calls made by one checkout request"
        graph={{
          nodes: [
            { id: "gw", label: "gateway" },
            { id: "checkout", label: "checkout" },
            { id: "pay", label: "payments" },
            { id: "inv", label: "inventory" },
            { id: "risk", label: "risk" },
            { id: "email", label: "email" },
          ],
          links: [
            { source: "gw", target: "checkout" },
            { source: "checkout", target: "pay" },
            { source: "checkout", target: "inv" },
            { source: "pay", target: "risk" },
            { source: "pay", target: "email" },
          ],
        }}
      />
    </div>
  );
}
