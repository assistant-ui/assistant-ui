// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

const input = spec({
  main: { type: "ListView", children: ["plain", "linked"] },
  plain: { type: "ListViewItem", children: ["plainText"] },
  plainText: { type: "Text", props: { value: "Plain" } },
  linked: {
    type: "ListViewItem",
    children: ["linkedText"],
    on: { press: { action: "open", params: { value: { $event: "" } } } },
  },
  linkedText: { type: "Text", props: { value: "Linked" } },
});

describe("list vocabulary on React Native", () => {
  it("presses only bound rows with the web payload", async () => {
    const nativeHandler = vi.fn();
    const webHandler = vi.fn();
    const native = renderNativeSpec(
      input,
      { open: nativeHandler },
      { open: { description: "Open" } },
    );
    const web = renderWebSpec(
      input,
      { open: webHandler },
      { open: { description: "Open" } },
    );
    expect(native.container.querySelectorAll('[role="button"]')).toHaveLength(
      1,
    );
    await press(byRole(native.container, "button", "Linked"));
    await act(async () =>
      web.container
        .querySelector<HTMLElement>('[data-aui="listview-item-trigger"]')!
        .click(),
    );
    expect(nativeHandler).toHaveBeenCalledOnce();
    expect(nativeHandler.mock.calls[0]![0]).toEqual(
      webHandler.mock.calls[0]![0],
    );
    const rows = [
      ...(native.container.firstElementChild as HTMLElement).children,
    ] as HTMLElement[];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.style.borderTopWidth).toBe("");
    expect(rows[1]!.style.borderTopWidth).toBe("1px");
    expect(rows[1]!.style.borderTopColor).toBe("rgba(229, 229, 229, 0.6)");
  });
});
