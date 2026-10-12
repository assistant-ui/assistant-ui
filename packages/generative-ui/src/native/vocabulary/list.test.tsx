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

  it("keeps a nested Button separate from the row action", async () => {
    const open = vi.fn();
    const remove = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "delete"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: "Order 42" } },
        delete: {
          type: "Button",
          props: { label: "Delete" },
          on: { press: { action: "remove" } },
        },
      }),
      { open, remove },
      { open: { description: "Open" }, remove: { description: "Remove" } },
    );

    expect(
      byRole(container, "button", "Order 42").getAttribute("aria-label"),
    ).toBe("Order 42");
    await press(byRole(container, "button", "Delete"));
    expect(remove).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();

    await press(container.querySelector<HTMLElement>('[aria-hidden="true"]')!);
    expect(open).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });

  it("activates only the inner bound row and names each row separately", async () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["outer"] },
        outer: {
          type: "ListViewItem",
          children: ["outerText", "inner"],
          on: { press: { action: "outer" } },
        },
        outerText: { type: "Text", props: { value: "Orders" } },
        inner: {
          type: "ListViewItem",
          children: ["innerText"],
          on: { press: { action: "inner" } },
        },
        innerText: { type: "Text", props: { value: "Order 42" } },
      }),
      { outer, inner },
      {
        outer: { description: "Outer" },
        inner: { description: "Inner" },
      },
    );

    expect(container.querySelectorAll('[role="button"]')).toHaveLength(2);
    await press(byRole(container, "button", "Order 42"));
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
    const innerText = [
      ...container.querySelectorAll<HTMLElement>('[aria-hidden="true"]'),
    ].find((text) => text.textContent === "Order 42")!;
    await press(innerText);
    expect(inner).toHaveBeenCalledTimes(2);
    expect(outer).not.toHaveBeenCalled();
    expect(
      byRole(container, "button", "Orders").getAttribute("aria-label"),
    ).toBe("Orders");
  });

  it("joins row text and updates its name when text changes", async () => {
    const input = (name: string) =>
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "status"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: name } },
        status: { type: "Caption", props: { value: "Shipped" } },
      });
    const rendered = renderNativeSpec(
      input("Order 42"),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(rendered.container, "button", "Order 42, Shipped"),
    ).toBeTruthy();
    await rendered.update(input("Order 43"));
    expect(
      byRole(rendered.container, "button", "Order 43, Shipped"),
    ).toBeTruthy();
  });

  it("hides consumed text only inside a bound row", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["bound", "plain"] },
        bound: {
          type: "ListViewItem",
          children: ["boundText"],
          on: { press: { action: "open" } },
        },
        boundText: { type: "Text", props: { value: "Bound" } },
        plain: { type: "ListViewItem", children: ["plainText"] },
        plainText: { type: "Text", props: { value: "Plain" } },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    const texts = container.querySelectorAll<HTMLElement>("[dir='auto']");
    expect(
      [...texts]
        .find((text) => text.textContent === "Bound")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      [...texts]
        .find((text) => text.textContent === "Plain")
        ?.getAttribute("aria-hidden"),
    ).not.toBe("true");

    const standalone = renderNativeSpec(
      spec({ main: { type: "Text", props: { value: "Standalone" } } }),
    );
    expect(
      standalone.container.firstElementChild?.getAttribute("aria-hidden"),
    ).not.toBe("true");
  });
});
