import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { createActionRegistry } from "../actionRegistry";
import type { GenerativeUIDispatch } from "../types";
import { listVocabulary } from "./list";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, listVocabulary)}</>);

describe("listVocabulary", () => {
  it("Steps renders its titled steps in order and skips an entry without a title", () => {
    const html = render({
      $type: "Steps",
      steps: [
        { title: "Remove the wheel", detail: "Open the quick release." },
        { detail: "No title" },
        "junk",
        { title: "Patch the tube" },
      ],
    });
    expect(html).toBe(
      '<ol data-aui="steps"><li data-aui="steps-item"><div data-aui="steps-title">Remove the wheel</div><div data-aui="steps-detail">Open the quick release.</div></li><li data-aui="steps-item"><div data-aui="steps-title">Patch the tube</div></li></ol>',
    );
  });

  it("Timeline renders each event's time, title, and detail in order", () => {
    const html = render({
      $type: "Timeline",
      items: [
        { time: "Day 1", title: "San Francisco to Monterey", detail: "2 h" },
        { time: "Day 2", title: "Big Sur" },
      ],
    });
    expect(html).toBe(
      '<ol data-aui="timeline"><li data-aui="timeline-item"><div data-aui="timeline-time">Day 1</div><div data-aui="timeline-title">San Francisco to Monterey</div><div data-aui="timeline-detail">2 h</div></li><li data-aui="timeline-item"><div data-aui="timeline-time">Day 2</div><div data-aui="timeline-title">Big Sur</div></li></ol>',
    );
  });

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
