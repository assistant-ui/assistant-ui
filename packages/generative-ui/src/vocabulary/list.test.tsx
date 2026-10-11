// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { createActionRegistry } from "../actionRegistry";
import type { GenerativeUIDispatch } from "../types";
import { alertVocabulary } from "./alert";
import { listVocabulary } from "./list";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

  it("ListViewItem places a named button beside its content when $action and dispatch are both present", () => {
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
    expect(html).toContain('<button type="button" aria-labelledby=');
    expect(html).toContain('data-aui="listview-item-content"');
    expect(html).not.toContain('role="button"');
  });

  it("switches a root ListViewItem to a Carousel and back without changing hook order", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const registry = createActionRegistry({ open: vi.fn() });
    const library = { ...listVocabulary, ...alertVocabulary };
    const item = {
      $type: "ListViewItem",
      $action: { type: "open" },
      children: "row",
    };
    const renderRoot = (node: unknown) =>
      root.render(
        renderGenerativeUI(node, library, {
          status: "done",
          dispatch: registry.dispatch,
        }),
      );

    try {
      await act(async () => renderRoot(item));
      expect(
        container.querySelector('[data-aui="listview-item-trigger"]'),
      ).not.toBeNull();
      await act(async () =>
        renderRoot({ $type: "Carousel", label: "Cards", children: [] }),
      );
      expect(
        container.querySelector('[data-aui="listview-item-trigger"]'),
      ).toBeNull();
      await act(async () => renderRoot(item));
      expect(
        container.querySelector('[data-aui="listview-item-trigger"]'),
      ).not.toBeNull();
      expect(
        errors.mock.calls
          .flat()
          .filter((message) =>
            /hook order|order of hooks|rendered (more|fewer) hooks/i.test(
              String(message),
            ),
          ),
      ).toEqual([]);
    } finally {
      await act(async () => root.unmount());
      errors.mockRestore();
    }
  });
});

describe("listVocabulary $action dispatch", () => {
  const rowOut = (dispatch: GenerativeUIDispatch) => {
    let output!: ReactElement<{ children: ReactElement }>;
    function Capture() {
      const item = listVocabulary.ListViewItem.render({
        $status: "done",
        $action: { type: "open" },
        $dispatch: dispatch,
        children: "row",
      }) as ReactElement;
      output = (item.type as (props: typeof item.props) => typeof output)(
        item.props,
      );
      return output;
    }
    renderToStaticMarkup(<Capture />);
    return output;
  };

  it("clicking the trigger fires $action with no $input", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ open: handler });
    const trigger = rowOut(registry.dispatch).props.children as ReactElement;
    const onClick = (trigger.props as { onClick: (e: unknown) => void })
      .onClick;
    onClick({
      target: { closest: () => null },
      currentTarget: trigger,
    });
    expect(handler).toHaveBeenCalledWith({ payload: { type: "open" } });
  });

  const getButton = (dispatch: GenerativeUIDispatch) => {
    const trigger = rowOut(dispatch).props.children;
    return (trigger.props as { children: ReactElement[] })
      .children[0]! as ReactElement<{
      onClick: (event: { currentTarget: unknown }) => void;
      onKeyDown?: unknown;
    }>;
  };

  const clickButton = (button: ReturnType<typeof getButton>) => {
    button.props.onClick({ currentTarget: button });
  };

  it("native button clicks fire $action once per activation", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ open: handler });
    const button = getButton(registry.dispatch);
    expect(button.props.onKeyDown).toBeUndefined();
    clickButton(button);
    clickButton(button);
    expect(handler).toHaveBeenCalledTimes(2);
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
    onClick({ target: nestedButton, currentTarget: {} });
    expect(handler).not.toHaveBeenCalled();
  });

  it('a click whose target sits inside a nested role="button" element does not fire the row action', () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ open: handler });
    const trigger = rowOut(registry.dispatch).props.children as ReactElement;
    const onClick = (trigger.props as { onClick: (e: unknown) => void })
      .onClick;
    const nestedRoleButton = {
      closest: (selector: string) =>
        selector.includes('[role="button"]') ? nestedRoleButton : null,
    };
    onClick({ target: nestedRoleButton, currentTarget: {} });
    expect(handler).not.toHaveBeenCalled();
  });
});
