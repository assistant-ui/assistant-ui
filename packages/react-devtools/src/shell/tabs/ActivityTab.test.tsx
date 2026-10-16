import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityTab } from "./ActivityTab";
import { projectApi } from "../../data/projectApi";
import { buildActivityNav } from "../../views/activity/activityNodes";

const base = 2_000_000_000_000;
const t = (ms: number) => new Date(base + ms);

describe("ActivityTab", () => {
  it("renders a split layout with runs and an event stream", () => {
    const html = renderToStaticMarkup(
      <ActivityTab
        apiId={1}
        data={{
          id: 1,
          logs: [
            { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
            { time: t(150), event: "composer.send", data: { threadId: "T1" } },
            { time: t(900), event: "thread.runEnd", data: { threadId: "T1" } },
          ],
          state: {},
        }}
        clearEvents={() => {}}
        theme="light"
        selection={null}
        setSelection={() => {}}
      />,
    );

    expect(html).toContain("All events");
    expect(html).toContain("Run #0");
    expect(html).toContain("900ms");
    expect(html).toContain("send");
  });

  it("keeps the selected run's detail visible as the event window rolls over", () => {
    const logs = Array.from({ length: 100 }, (_, index) => [
      {
        time: t(index * 2),
        event: "thread.runStart",
        data: { threadId: `T${index}` },
      },
      {
        time: t(index * 2 + 1),
        event: "thread.runEnd",
        data: { threadId: `T${index}` },
      },
    ]).flat();
    const before = projectApi(1, { api: {}, logs });
    const selection = buildActivityNav(before.logs).nodes.find(
      (node) => node.kind === "run" && node.run.threadId === "T1",
    )!.id;
    const after = projectApi(1, {
      api: {},
      logs: [
        ...logs,
        { time: t(200), event: "thread.runStart", data: { threadId: "T100" } },
      ].slice(-200),
    });
    const html = renderToStaticMarkup(
      <ActivityTab
        apiId={1}
        data={after}
        clearEvents={() => {}}
        theme="light"
        selection={selection}
        setSelection={() => {}}
      />,
    );

    expect(html).toContain(">T1<");
    expect(html).not.toContain(">T2<");
  });
});
