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
  generateTitle,
}: Titles & { generateTitle: () => void }) => {
  useOpenCodeThreadListTitleSync(
    sessionTitle,
    threadListTitle,
    generateTitle,
    enabled,
  );
  return null;
};

describe("useOpenCodeThreadListTitleSync", () => {
  let root: Root | undefined;

  const render = (titles: Titles, generateTitle: () => void) => {
    act(() => {
      root ??= createRoot(document.createElement("div"));
      root.render(
        <StrictMode>
          <Probe {...titles} generateTitle={generateTitle} />
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

  it("requests the title once OpenCode titles the session, not for its default title", () => {
    const generateTitle = vi.fn();

    render(
      { sessionTitle: "New session - 2026-10-10T15:00:51.077Z" },
      generateTitle,
    );
    expect(generateTitle).not.toHaveBeenCalled();

    render({ sessionTitle: "Fix the login redirect" }, generateTitle);
    expect(generateTitle).toHaveBeenCalledOnce();

    render(
      {
        sessionTitle: "Fix the login redirect",
        threadListTitle: "Fix the login redirect",
      },
      generateTitle,
    );
    expect(generateTitle).toHaveBeenCalledOnce();
  });

  it("does not request a title for a rename the session then reports", () => {
    const generateTitle = vi.fn();

    render({ sessionTitle: "Draft", threadListTitle: "Draft" }, generateTitle);
    render(
      { sessionTitle: "Draft", threadListTitle: "Release notes" },
      generateTitle,
    );
    render(
      { sessionTitle: "Release notes", threadListTitle: "Release notes" },
      generateTitle,
    );

    expect(generateTitle).not.toHaveBeenCalled();
  });

  it("requests a stale listed title once on mount", () => {
    const generateTitle = vi.fn();

    render(
      { sessionTitle: "New title", threadListTitle: "Old title" },
      generateTitle,
    );

    expect(generateTitle).toHaveBeenCalledOnce();
  });

  it("requests again when the session returns to a title it already requested", () => {
    const generateTitle = vi.fn();

    render(
      { sessionTitle: "Plan", threadListTitle: "Old title" },
      generateTitle,
    );
    render({ sessionTitle: "Plan", threadListTitle: "Plan" }, generateTitle);
    render({ sessionTitle: "Ship", threadListTitle: "Ship" }, generateTitle);
    render({ sessionTitle: "Plan", threadListTitle: "Ship" }, generateTitle);

    expect(generateTitle).toHaveBeenCalledTimes(2);
  });

  // Activity is React 19 only.
  it.skipIf(onReact18)(
    "does not request again when the thread is revealed before the list catches up",
    async () => {
      const generateTitle = vi.fn();
      const view = (mode: "visible" | "hidden") => (
        <Activity mode={mode}>
          <Probe
            sessionTitle="New title"
            threadListTitle="Old title"
            generateTitle={generateTitle}
          />
        </Activity>
      );

      await act(async () => {
        root = createRoot(document.createElement("div"));
        root.render(view("visible"));
      });
      await act(async () => root!.render(view("hidden")));
      await act(async () => root!.render(view("visible")));

      expect(generateTitle).toHaveBeenCalledOnce();
    },
  );

  it("does nothing when disabled", () => {
    const generateTitle = vi.fn();

    render(
      {
        sessionTitle: "New title",
        threadListTitle: "Old title",
        enabled: false,
      },
      generateTitle,
    );

    expect(generateTitle).not.toHaveBeenCalled();
  });
});
