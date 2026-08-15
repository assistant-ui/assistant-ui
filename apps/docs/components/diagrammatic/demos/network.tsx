import { Network } from "diagrammatic";

export function NetworkDemo() {
  return (
    <Network
      title="Service dependencies"
      graph={{
        nodes: [
          { id: "api", label: "api" },
          { id: "web", label: "web" },
          { id: "db", label: "db" },
          { id: "jobs", label: "jobs" },
          { id: "cache", label: "cache" },
          { id: "auth", label: "auth" },
          { id: "w1" },
          { id: "w2" },
          { id: "d1" },
          { id: "d2" },
          { id: "j1" },
          { id: "c1" },
        ],
        links: [
          { source: "api", target: "web" },
          { source: "api", target: "db" },
          { source: "api", target: "jobs" },
          { source: "api", target: "cache" },
          { source: "api", target: "auth" },
          { source: "web", target: "w1" },
          { source: "web", target: "w2" },
          { source: "db", target: "d1" },
          { source: "db", target: "d2" },
          { source: "jobs", target: "j1" },
          { source: "cache", target: "c1" },
          { source: "web", target: "db" },
        ],
      }}
    />
  );
}
