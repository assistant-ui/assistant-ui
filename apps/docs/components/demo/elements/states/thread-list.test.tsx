// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { ThreadListRuntime, threadListFixtures } from "./thread-list";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const groupedRows = (container: HTMLElement) => {
  const rows: string[] = [];
  let label = "";
  for (const el of container.querySelectorAll(
    '[data-slot="aui_thread-list-group-label"], [data-slot="aui_thread-list-item-title"]',
  )) {
    if (el.getAttribute("data-slot") === "aui_thread-list-group-label") {
      label = el.textContent ?? "";
    } else {
      rows.push(`${label}: ${el.textContent}`);
    }
  }
  return rows;
};

describe("thread list fixtures", () => {
  it.each([
    [0, 0],
    [0, 1],
    [2, 30],
    [4, 59],
    [12, 0],
    [23, 59],
  ])("group as intended at %i:%i local time", async (hour, minute) => {
    const now = new Date(2026, 10, 9, hour, minute);
    vi.useFakeTimers({ toFake: ["Date"], now });

    const { container } = render(
      <ThreadListRuntime threads={threadListFixtures(now).grouped}>
        <ThreadList />
      </ThreadListRuntime>,
    );

    await waitFor(() =>
      expect(groupedRows(container)).toEqual([
        "Today: Persist composer drafts",
        "Today: Fix flaky checkout test",
        "Yesterday: Postgres 17 upgrade plan",
        "Yesterday: Rate limit headers",
        "Earlier: Quarterly usage report",
        "Earlier: Onboarding email copy",
      ]),
    );
  });

  it("never dates a thread after now", () => {
    const now = new Date(2026, 10, 9, 0, 1);
    const threads = Object.values(threadListFixtures(now)).flat();

    for (const thread of threads) {
      expect(thread.lastMessageAt!.getTime()).toBeLessThanOrEqual(
        now.getTime(),
      );
    }
  });
});
