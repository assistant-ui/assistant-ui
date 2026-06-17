import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityTab } from "./ActivityTab";

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
});
