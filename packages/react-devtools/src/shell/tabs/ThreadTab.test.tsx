import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

let capturedOnClick: (() => unknown) | undefined;

vi.mock("../../views/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../views/ui")>()),
  ControlButton: ({ onClick, children }: ComponentProps<"button">) => {
    capturedOnClick = onClick as () => unknown;
    return <button>{children}</button>;
  },
}));

import { ThreadTab } from "./ThreadTab";

const renderUnloadedConversation = (
  switchToThread: (threadId: string) => void | Promise<void>,
) => {
  renderToStaticMarkup(
    <ThreadTab
      apiId={1}
      data={{
        id: 1,
        state: {
          threads: {
            threadIds: ["thread-1"],
            archivedThreadIds: [],
            threadItems: [{ id: "thread-1" }],
          },
        },
        logs: [],
        threadSnapshots: {},
      }}
      clearEvents={() => {}}
      theme="light"
      selection={null}
      setSelection={() => {}}
      switchToThread={switchToThread}
    />,
  );
};

describe("ThreadTab", () => {
  it("handles rejected conversation switches", async () => {
    renderUnloadedConversation(() => Promise.reject(new Error("failed")));

    expect(capturedOnClick?.()).toBeUndefined();
    await Promise.resolve();
  });

  it("handles synchronous conversation switch errors", () => {
    renderUnloadedConversation(() => {
      throw new Error("failed");
    });

    expect(() => capturedOnClick?.()).not.toThrow();
  });
});
