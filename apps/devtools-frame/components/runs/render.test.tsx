import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EventLogEntry } from "../common";
import { RunTimeline } from "./RunTimeline";

const base = 2_000_000_000_000;
const t = (ms: number) => new Date(base + ms);

describe("RunTimeline", () => {
  it("renders a completed run with its duration and events", () => {
    const logs: EventLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(150), event: "composer.send", data: { threadId: "T1" } },
      { time: t(900), event: "thread.runEnd", data: { threadId: "T1" } },
    ];

    const html = renderToStaticMarkup(<RunTimeline logs={logs} />);
    expect(html).toContain("Run #0");
    expect(html).toContain("900ms");
    expect(html).toContain("send");
    expect(html).toContain("Runs");
  });

  it("marks an unfinished run as running", () => {
    const logs: EventLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
    ];
    const html = renderToStaticMarkup(<RunTimeline logs={logs} />);
    expect(html).toContain("running");
  });

  it("shows the empty state with no logs", () => {
    const html = renderToStaticMarkup(<RunTimeline logs={[]} />);
    expect(html).toContain("No runs recorded");
  });
});
