// @vitest-environment jsdom
import { Activity, StrictMode, act, version } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOpenCodeThreadListTitleSync } from "./useOpenCodeThreadListTitleSync";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const onReact18 = version.startsWith("18.");

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

  it("reloads again when the session returns to a title it already reloaded for", () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    render({ sessionTitle: "Plan", threadListTitle: "Old title" }, reload);
    render({ sessionTitle: "Plan", threadListTitle: "Plan" }, reload);
    render({ sessionTitle: "Ship", threadListTitle: "Ship" }, reload);
    render({ sessionTitle: "Plan", threadListTitle: "Ship" }, reload);

    expect(reload).toHaveBeenCalledTimes(2);
  });

  // Activity is React 19 only.
  it.skipIf(onReact18)(
    "does not reload again when the thread is revealed before its reload settles",
    async () => {
      const reload = vi.fn(() => new Promise<void>(() => {}));
      const view = (mode: "visible" | "hidden") => (
        <Activity mode={mode}>
          <Probe
            sessionTitle="New title"
            threadListTitle="Old title"
            reload={reload}
          />
        </Activity>
      );

      await act(async () => {
        root = createRoot(document.createElement("div"));
        root.render(view("visible"));
      });
      await act(async () => root!.render(view("hidden")));
      await act(async () => root!.render(view("visible")));

      expect(reload).toHaveBeenCalledOnce();
    },
  );

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
