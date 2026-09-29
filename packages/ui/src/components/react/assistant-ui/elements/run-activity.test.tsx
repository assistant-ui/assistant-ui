import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RunActivity,
  type RunActivityEntry,
  type RunActivityProps,
} from "./run-activity";

afterEach(cleanup);

const ENTRIES: RunActivityEntry[] = [
  {
    id: "commentary-1",
    kind: "commentary",
    label: "Inspecting files",
    content: <p>I’ll inspect the files.</p>,
  },
  {
    id: "read-1",
    kind: "tool",
    label: "Reading source",
    content: <a href="#source">Read source</a>,
  },
  {
    id: "commentary-2",
    kind: "commentary",
    label: "Checking the fix",
    content: <p>I found the issue; checking the fix.</p>,
  },
];

function Run(props: Partial<RunActivityProps>) {
  const [open, setOpen] = useState(false);
  return (
    <RunActivity
      status="running"
      statusLabel="Working"
      durationLabel="12s"
      entries={ENTRIES}
      open={open}
      onOpenChange={setOpen}
      attention={<button type="button">Approve search</button>}
      {...props}
    >
      <p>Final answer</p>
    </RunActivity>
  );
}

describe("RunActivity", () => {
  it("keeps decisions and the answer visible when activity is collapsed", () => {
    render(<Run />);
    const trigger = screen.getByRole("button", { name: "Working 12s" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Read source" })).toBeNull();
    expect(screen.getByRole("button", { name: "Approve search" })).toBeTruthy();
    expect(screen.getByText("Final answer")).toBeTruthy();
    expect(screen.getByText("Checking the fix")).toBeTruthy();
  });

  it("discloses commentary and tools in their original order", () => {
    render(<Run />);
    fireEvent.click(screen.getByRole("button", { name: "Working 12s" }));
    const list = screen.getByRole("list");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "I’ll inspect the files.",
      "Read source",
      "I found the issue; checking the fix.",
    ]);
    expect(within(list).queryByText("Final answer")).toBeNull();
    expect(
      within(list).queryByRole("button", { name: "Approve search" }),
    ).toBeNull();
  });

  it("preserves user expansion and focused content through updates and completion", () => {
    const { rerender } = render(<Run />);
    fireEvent.click(screen.getByRole("button", { name: "Working 12s" }));
    const link = screen.getByRole("link", { name: "Read source" });
    link.focus();
    rerender(<Run durationLabel="13s" entries={[...ENTRIES]} />);
    expect(document.activeElement).toBe(link);
    rerender(
      <Run status="complete" statusLabel="Worked for" durationLabel="24s" />,
    );
    expect(
      screen
        .getByRole("button", { name: "Worked for 24s" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(document.activeElement).toBe(link);
  });

  it("does not reopen after a manual collapse when activity arrives", () => {
    const { rerender } = render(<Run />);
    const trigger = screen.getByRole("button", { name: "Working 12s" });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    rerender(
      <Run
        entries={[
          ...ENTRIES,
          {
            id: "test-1",
            kind: "tool",
            label: "Testing",
            content: "Tests passed",
          },
        ]}
      />,
    );
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Testing")).toBeTruthy();
  });

  it.each([
    ["requires-action", "Needs your input"],
    ["complete", "Worked for"],
    ["cancelled", "Stopped after"],
    ["incomplete", "Incomplete"],
    ["error", "Failed after"],
  ] as const)(
    "exposes %s without a stale current activity",
    (status, label) => {
      render(<Run status={status} statusLabel={label} />);
      expect(screen.getByRole("status").textContent).toBe(label);
      expect(screen.queryByText("Checking the fix")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Approve search" }),
      ).toBeTruthy();
    },
  );

  it("announces status changes without announcing every token or timer tick", () => {
    const { rerender } = render(<Run />);
    const announcement = screen.getByRole("status");
    rerender(
      <Run
        durationLabel="13s"
        entries={[{ ...ENTRIES[0]!, label: "A new token" }]}
      />,
    );
    expect(announcement.textContent).toBe("Working");
    rerender(<Run status="error" statusLabel="Failed" />);
    expect(announcement.textContent).toBe("Failed");
  });

  it("does not invent a duration or a disclosure for an empty run", () => {
    render(<Run entries={[]} durationLabel={undefined} />);
    expect(screen.queryByRole("button", { name: /Working/ })).toBeNull();
    expect(screen.queryByText(/12s/)).toBeNull();
    expect(screen.getByRole("button", { name: "Approve search" })).toBeTruthy();
    expect(screen.getByText("Final answer")).toBeTruthy();
  });

  it("keeps the latest nonempty activity label without changing entry order", () => {
    render(
      <Run
        entries={[
          ...ENTRIES,
          { id: "empty", kind: "tool", label: "  ", content: "Output" },
        ]}
      />,
    );
    expect(screen.getByText("Checking the fix")).toBeTruthy();
  });

  it("uses the persisted duration after remount", () => {
    const view = render(
      <Run status="complete" statusLabel="Worked for" durationLabel="2m 13s" />,
    );
    view.unmount();
    render(
      <Run status="complete" statusLabel="Worked for" durationLabel="2m 13s" />,
    );
    expect(
      screen.getByRole("button", { name: "Worked for 2m 13s" }),
    ).toBeTruthy();
  });

  it("reports user intent without overriding controlled expansion", () => {
    const onOpenChange = vi.fn();
    render(
      <Run
        open={false}
        onOpenChange={onOpenChange}
        statusLabel="작업 중"
        durationLabel="12초"
      />,
    );
    const trigger = screen.getByRole("button", { name: "작업 중 12초" });
    fireEvent.click(trigger);
    expect(onOpenChange.mock.calls.map(([open]) => open)).toEqual([true]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
