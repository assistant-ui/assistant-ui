// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAui: vi.fn<() => { threads: { switchToThread: () => void } }>(() => ({
    threads: { switchToThread: vi.fn() },
  })),
  useAuiState: vi.fn<
    (
      selector: (state: {
        threadListItem: { remoteId: string | null };
      }) => unknown,
    ) => unknown
  >((selector) => selector({ threadListItem: { remoteId: null } })),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: mocks.useAui,
  useAuiState: mocks.useAuiState,
}));

vi.mock("../runtime/xulux-local-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../runtime/xulux-local-storage")>()),
  useNormalizeInterruptedXuluxThreads: vi.fn(),
  useXuluxStoredThreads: () => [],
}));

import { XuluxHeaderActions } from "./XuluxHeaderActions";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("XuluxHeaderActions", () => {
  it("tracks the active AI Builder mode in the playground", () => {
    const playgroundPage = readFileSync(
      resolve(process.cwd(), "app/(demos)/playground/page.tsx"),
      "utf8",
    );
    const xuluxApp = readFileSync(
      resolve(process.cwd(), "components/xulux/XuluxApp.tsx"),
      "utf8",
    );
    const xuluxShell = readFileSync(
      resolve(process.cwd(), "components/xulux/shell/XuluxShell.tsx"),
      "utf8",
    );

    expect(playgroundPage).toContain(
      '<XuluxApp headerActionsVisible={mode === "agent"} />',
    );
    expect(xuluxApp).toContain("headerActionsVisible={headerActionsVisible}");
    expect(xuluxShell).toContain("visible={headerActionsVisible}");
  });

  it("names its controls and removes the whole portal when hidden", () => {
    const portal = document.createElement("div");
    portal.dataset.subProjectHeaderPortal = "";
    document.body.append(portal);

    const props = {
      visible: true,
      showChatActions: true,
      onNewChat: vi.fn(),
      onShowTemplates: vi.fn(),
      onRestoreThread: vi.fn(),
    };
    const view = render(<XuluxHeaderActions {...props} />);

    for (const name of ["History", "Templates", "New"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }

    view.rerender(<XuluxHeaderActions {...props} visible={false} />);

    for (const name of ["History", "Templates", "New"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });
});
