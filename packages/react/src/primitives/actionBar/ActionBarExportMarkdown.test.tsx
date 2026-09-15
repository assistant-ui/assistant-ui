/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type * as AssistantStore from "@assistant-ui/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionBarPrimitiveExportMarkdown } from "./ActionBarExportMarkdown";

const { getCopyText } = vi.hoisted(() => ({
  getCopyText: vi.fn(() => "# Exported message"),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof AssistantStore>();
  return {
    ...actual,
    useAui: () => ({ message: { getCopyText } }),
    useAuiState: () => true,
  };
});

describe("ActionBarPrimitiveExportMarkdown", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    getCopyText.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("handles rejected asynchronous exports", async () => {
    const error = new Error("remote save failed");
    const onExport = vi.fn().mockRejectedValue(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      root.render(
        <ActionBarPrimitiveExportMarkdown onExport={onExport}>
          Export
        </ActionBarPrimitiveExportMarkdown>,
      );
    });

    await act(async () => {
      container.querySelector("button")!.click();
    });

    expect(onExport).toHaveBeenCalledWith("# Exported message");
    expect(errorSpy).toHaveBeenCalledWith(
      "[assistant-ui] markdown export failed:",
      error,
    );
  });

  it("attaches the download anchor before clicking it", async () => {
    const createObjectURL = vi.fn(() => "blob:markdown");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    let clickedAnchor: HTMLAnchorElement | undefined;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedAnchor = this;
        expect(this.isConnected).toBe(true);
        expect(this.rel).toBe("noopener");
      });

    await act(async () => {
      root.render(
        <ActionBarPrimitiveExportMarkdown>
          Export
        </ActionBarPrimitiveExportMarkdown>,
      );
    });

    await act(async () => {
      container.querySelector("button")!.click();
    });

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickedAnchor?.isConnected).toBe(false);
  });
});
