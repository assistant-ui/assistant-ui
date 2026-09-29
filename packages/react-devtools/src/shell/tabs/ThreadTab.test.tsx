import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThreadTab } from "./ThreadTab";

describe("ThreadTab", () => {
  it("renders a conversation list containing only archived threads", () => {
    const html = renderToStaticMarkup(
      <ThreadTab
        apiId={1}
        data={{
          id: 1,
          logs: [],
          state: {
            thread: {
              messages: [
                {
                  id: "wrong-thread-message",
                  role: "assistant",
                  content: [{ type: "text", text: "Wrong conversation" }],
                },
              ],
            },
            threads: {
              threadIds: [],
              archivedThreadIds: ["archived-1"],
              threadItems: [
                {
                  id: "archived-1",
                  title: "Archived conversation",
                  status: "archived",
                },
              ],
            },
          },
        }}
        clearEvents={() => {}}
        theme="light"
        selection={null}
        setSelection={() => {}}
        switchToThread={() => {}}
      />,
    );

    expect(html).toContain("1 archived");
    expect(html).toContain("Archived conversation");
    expect(html).toContain("Load conversation");
    expect(html).not.toContain("Wrong conversation");
  });
});
