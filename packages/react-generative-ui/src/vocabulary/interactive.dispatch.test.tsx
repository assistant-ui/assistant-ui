import { describe, it, expect, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { interactiveVocabulary } from "./interactive";
import { createActionRegistry } from "../actionRegistry";

/** The props shape `Button.render` receives when the renderer injects `$action`
 * and `$dispatch`. Used to call `render` directly so the test can invoke
 * `onClick` without a DOM. */
type ButtonRenderProps = {
  label: string;
  $status: "done";
  $action?: { type: string; [k: string]: unknown };
  $dispatch?: (a: unknown) => unknown;
};

describe("interactiveVocabulary $action dispatch", () => {
  it("Button render attaches an onClick that fires $dispatch with the $action payload", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ purchase: handler });
    const out = interactiveVocabulary.Button.render({
      label: "Buy",
      $status: "done",
      $action: { type: "purchase", itemId: "sku-1" },
      $dispatch: registry.dispatch,
    } as ButtonRenderProps) as ReactNode;
    expect(isValidElement(out)).toBe(true);
    const onClick = (out as { props: { onClick: () => void } }).props.onClick;
    expect(typeof onClick).toBe("function");
    onClick();
    expect(handler).toHaveBeenCalledWith({
      payload: { type: "purchase", itemId: "sku-1" },
    });
  });

  it("Button onClick is a no-op when no $dispatch is wired (read-only render)", () => {
    const out = interactiveVocabulary.Button.render({
      label: "Buy",
      $status: "done",
      $action: { type: "purchase", itemId: "sku-1" },
    } as ButtonRenderProps) as ReactNode;
    const onClick = (out as { props: { onClick: () => void } }).props.onClick;
    expect(typeof onClick).toBe("function");
    expect(() => onClick()).not.toThrow();
  });

  it("Button onClick is a no-op when $action is absent", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ purchase: handler });
    const out = interactiveVocabulary.Button.render({
      label: "Go",
      $status: "done",
      $dispatch: registry.dispatch,
    } as ButtonRenderProps) as ReactNode;
    (out as { props: { onClick: () => void } }).props.onClick();
    expect(handler).not.toHaveBeenCalled();
  });

  it("Select onChange merges the selected value into $input and preserves a model-supplied $action.value", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ pick: handler });
    const out = interactiveVocabulary.Select.render({
      options: [{ label: "A", value: "a" }],
      $status: "done",
      $action: { type: "pick", value: "model-supplied" },
      $dispatch: registry.dispatch,
    }) as ReactNode;
    const onChange = (
      out as {
        props: { onChange: (e: { currentTarget: { value: string } }) => void };
      }
    ).props.onChange;
    onChange({ currentTarget: { value: "user-picked" } });
    expect(handler).toHaveBeenCalledWith({
      payload: {
        type: "pick",
        value: "model-supplied",
        $input: "user-picked",
      },
    });
  });

  it("Input onKeyDown (Enter) merges the entered value into $input", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ submit: handler });
    const out = interactiveVocabulary.Input.render({
      $status: "done",
      $action: { type: "submit" },
      $dispatch: registry.dispatch,
    }) as ReactNode;
    const onKeyDown = (
      out as {
        props: {
          onKeyDown: (e: {
            key: string;
            nativeEvent: { isComposing: boolean };
            currentTarget: { value: string };
          }) => void;
        };
      }
    ).props.onKeyDown;
    onKeyDown({
      key: "Enter",
      nativeEvent: { isComposing: false },
      currentTarget: { value: "typed text" },
    });
    expect(handler).toHaveBeenCalledWith({
      payload: { type: "submit", $input: "typed text" },
    });
  });
});
