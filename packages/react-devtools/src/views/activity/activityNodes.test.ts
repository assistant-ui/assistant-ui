import { describe, expect, it } from "vitest";
import type { EventLogEntry } from "../../data/types";
import { buildActivityNav, defaultActivitySelection } from "./activityNodes";

const base = 2_000_000_000_000;
const t = (ms: number) => new Date(base + ms);

describe("buildActivityNav", () => {
  it("lists stream, runs newest-first, and orphans", () => {
    const logs: EventLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(100), event: "composer.send", data: { threadId: "T1" } },
      { time: t(200), event: "thread.runEnd", data: { threadId: "T1" } },
      { time: t(300), event: "composer.edit", data: {} },
    ];

    const { nodes, runs, orphans } = buildActivityNav(logs);
    expect(nodes[0]?.id).toBe("activity:stream");
    expect(runs).toHaveLength(1);
    expect(orphans).toHaveLength(1);
    expect(nodes.some((node) => node.id === "activity:orphans")).toBe(true);
    expect(defaultActivitySelection(nodes)).toBe("activity:run:run-0");
  });
});
