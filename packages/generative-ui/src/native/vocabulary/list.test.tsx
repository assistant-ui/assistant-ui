// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  renderElement,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";
import { listVocabulary } from "./list";

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
  it("renders numbered Steps in web order and skips malformed entries", () => {
    const steps = [
      { title: "Prepare", detail: "Gather tools" },
      { detail: "Missing title" },
      null,
      { title: "Finish" },
    ];
    const container = renderElement(
      listVocabulary.Steps.render({ steps } as never),
    );
    const web = renderWebSpec(
      spec({ main: { type: "Steps", props: { steps: [steps[0], steps[3]] } } }),
    );
    expect(container.textContent).toBe("1PrepareGather tools2Finish");
    expect(container.textContent!.replace(/[12]/g, "")).toBe(
      web.container.textContent,
    );
    expect(container.querySelectorAll('[role="list"]')).toHaveLength(1);
  });

  it("renders Timeline time, title, and detail in web order", () => {
    const items = [
      { time: "09:00", title: "Depart", detail: "North gate" },
      { time: "10:00", title: "Arrive" },
    ];
    const native = renderNativeSpec(
      spec({ main: { type: "Timeline", props: { items } } }),
    );
    const web = renderWebSpec(
      spec({ main: { type: "Timeline", props: { items } } }),
    );
    expect(native.container.textContent).toBe(web.container.textContent);
    expect(native.container.textContent).toBe(
      "09:00DepartNorth gate10:00Arrive",
    );
    expect(native.container.querySelectorAll('[role="list"]')).toHaveLength(1);
    expect(
      renderElement(
        listVocabulary.Timeline.render({
          items: [{ title: "No time" }],
        } as never),
      ).textContent,
    ).toBe("No time");
  });

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
    const list = native.container.firstElementChild as HTMLElement;
    expect(list.getAttribute("role")).toBe("list");
    const content = list.firstElementChild as HTMLElement;
    const rows = [...content.children] as HTMLElement[];
    expect(rows).toHaveLength(2);
    expect(getComputedStyle(content).marginBottom).toBe("-1px");
    expect(getComputedStyle(rows[0]!).borderBottomWidth).toBe("1px");
    expect(getComputedStyle(rows[1]!).borderBottomColor).toBe(
      "rgba(229, 229, 229, 0.6)",
    );
  });

  it("draws one divider when the middle item is hidden", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["first", "hidden", "last"] },
        first: { type: "ListViewItem", children: ["a"] },
        hidden: { type: "ListViewItem", visible: false, children: ["b"] },
        last: { type: "ListViewItem", children: ["c"] },
        a: { type: "Text", props: { value: "A" } },
        b: { type: "Text", props: { value: "B" } },
        c: { type: "Text", props: { value: "C" } },
      }),
    );
    const list = container.firstElementChild as HTMLElement;
    const content = list.firstElementChild as HTMLElement;
    const rows = [...content.children] as HTMLElement[];
    expect(rows.map((row) => row.textContent)).toEqual(["A", "C"]);
    expect(rows.map((row) => getComputedStyle(row).borderBottomWidth)).toEqual([
      "1px",
      "1px",
    ]);
    expect(getComputedStyle(content).marginBottom).toBe("-1px");
  });

  it("does not press an action without a dispatch function", () => {
    const container = renderElement(
      <>
        {listVocabulary.ListViewItem.render({
          $action: { action: "open" },
          children: "A",
        } as never)}
      </>,
    );
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(container.textContent).toBe("A");
  });
});
