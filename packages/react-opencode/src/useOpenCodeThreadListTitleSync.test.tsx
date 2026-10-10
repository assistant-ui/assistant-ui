// @vitest-environment jsdom
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOpenCodeThreadListTitleSync } from "./useOpenCodeThreadListTitleSync";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Titles = {
  sessionTitle?: string | undefined;
  threadListTitle?: string | undefined;
  enabled?: boolean;
};

const Probe = ({
  sessionTitle,
  threadListTitle,
  enabled = true,
  reload,
}: Titles & { reload: () => Promise<void> }) => {
  useOpenCodeThreadListTitleSync(
    sessionTitle,
    threadListTitle,
    reload,
    enabled,
  );
  return null;
};

describe("useOpenCodeThreadListTitleSync", () => {
  let root: Root | undefined;

  const render = (titles: Titles, reload: () => Promise<void>) => {
    act(() => {
      root ??= createRoot(document.createElement("div"));
      root.render(
        <StrictMode>
          <Probe {...titles} reload={reload} />
        </StrictMode>,
      );
    });
  };

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
  });

  it("reloads the thread list once OpenCode titles the session, not for its default title", () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    render({ sessionTitle: "New session - 2026-10-10T15:00:51.077Z" }, reload);
    expect(reload).not.toHaveBeenCalled();

    render({ sessionTitle: "Fix the login redirect" }, reload);
    expect(reload).toHaveBeenCalledOnce();

    render(
      {
        sessionTitle: "Fix the login redirect",
        threadListTitle: "Fix the login redirect",
      },
      reload,
    );
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload for a rename the session then reports", () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    render({ sessionTitle: "Draft", threadListTitle: "Draft" }, reload);
    render({ sessionTitle: "Draft", threadListTitle: "Release notes" }, reload);
    render(
      { sessionTitle: "Release notes", threadListTitle: "Release notes" },
      reload,
    );

    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads a stale listed title once on mount", () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    render({ sessionTitle: "New title", threadListTitle: "Old title" }, reload);

    expect(reload).toHaveBeenCalledOnce();
  });

  it("does nothing when disabled", () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    render(
      {
        sessionTitle: "New title",
        threadListTitle: "Old title",
        enabled: false,
      },
      reload,
    );

    expect(reload).not.toHaveBeenCalled();
  });
});
