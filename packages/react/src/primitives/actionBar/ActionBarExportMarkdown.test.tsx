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
    vi.restoreAllMocks();
  });

  it("clicks a download anchor that is attached to the document", async () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:export");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const connectedAtClick: boolean[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      connectedAtClick.push(this.isConnected);
    });

    await act(async () => {
      root.render(
        <ActionBarPrimitiveExportMarkdown filename="message.md">
          Export
        </ActionBarPrimitiveExportMarkdown>,
      );
    });

    await act(async () => {
      container.querySelector("button")!.click();
    });

    expect(createObjectURL).toHaveBeenCalled();
    // Firefox ignores a programmatic click on a detached anchor.
    expect(connectedAtClick).toEqual([true]);
    expect(document.querySelector('a[download="message.md"]')).toBeNull();
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
});
