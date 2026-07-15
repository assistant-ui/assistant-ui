import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { createActionRegistry } from "../actionRegistry";
import { listVocabulary } from "./list";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, listVocabulary)}</>);

describe("listVocabulary", () => {
  it("ListView renders a ul wrapping its children", () => {
    const html = render({
      $type: "ListView",
      children: [
        { $type: "ListViewItem", children: "a" },
        { $type: "ListViewItem", children: "b" },
      ],
    });
    expect(html).toContain('<ul data-aui="listview">');
    expect((html.match(/data-aui="listview-item"/g) ?? []).length).toBe(2);
  });

  it("ListViewItem without $action renders children directly with no trigger wrapper", () => {
    expect(render({ $type: "ListViewItem", children: "row" })).toBe(
      '<li data-aui="listview-item">row</li>',
    );
  });

  it("ListViewItem with $action but no dispatch renders children directly (read-only)", () => {
    expect(
      render({
        $type: "ListViewItem",
        $action: { type: "open" },
        children: "row",
      }),
    ).toBe('<li data-aui="listview-item">row</li>');
  });

  it("ListViewItem wraps children in a clickable trigger when $action and dispatch are both present", () => {
    const registry = createActionRegistry({ open: vi.fn() });
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          { $type: "ListViewItem", $action: { type: "open" }, children: "row" },
          listVocabulary,
          { status: "done", dispatch: registry.dispatch },
        )}
      </>,
    );
    expect(html).toContain('data-aui="listview-item-trigger"');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
  });
});

describe("listVocabulary $action dispatch", () => {
  const rowOut = (dispatch: (a: unknown) => unknown) =>
    listVocabulary.ListViewItem.render({
      $status: "done",
      $action: { type: "open" },
      $dispatch: dispatch,
      children: "row",
    }) as ReactElement;

  it("clicking the trigger fires $action with no $input", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ open: handler });
    const trigger = rowOut(registry.dispatch).props.children as ReactElement;
    const onClick = (trigger.props as { onClick: (e: unknown) => void })
      .onClick;
    onClick({ target: { closest: () => null } });
    expect(handler).toHaveBeenCalledWith({ payload: { type: "open" } });
  });

  it("Enter and Space keydown both fire $action", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ open: handler });
    const trigger = rowOut(registry.dispatch).props.children as ReactElement;
    const onKeyDown = (
      trigger.props as { onKeyDown: (e: { key: string }) => void }
    ).onKeyDown;
    onKeyDown({ key: "Enter" });
    onKeyDown({ key: " " });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("a keydown for any other key does not fire $action", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ open: handler });
    const trigger = rowOut(registry.dispatch).props.children as ReactElement;
    const onKeyDown = (
      trigger.props as { onKeyDown: (e: { key: string }) => void }
    ).onKeyDown;
    onKeyDown({ key: "Tab" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("a click whose target sits inside a nested interactive element does not fire the row action", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ open: handler });
    const trigger = rowOut(registry.dispatch).props.children as ReactElement;
    const onClick = (trigger.props as { onClick: (e: unknown) => void })
      .onClick;
    const nestedButton = {
      closest: (selector: string) =>
        selector.includes("button") ? nestedButton : null,
    };
    onClick({ target: nestedButton });
    expect(handler).not.toHaveBeenCalled();
  });
});
