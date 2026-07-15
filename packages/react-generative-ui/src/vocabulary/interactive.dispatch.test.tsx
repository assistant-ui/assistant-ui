import { describe, it, expect, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

/**
 * Calls a `render` that itself uses hooks (e.g. `RadioGroup`'s `useId`) from inside an active React render pass, then hands back the resulting element with its handlers intact so the test can invoke them directly.
 */
function renderWithHooks(render: () => ReactNode): ReactElement {
  let captured: ReactElement | undefined;
  function Capture() {
    captured = render() as ReactElement;
    return captured;
  }
  renderToStaticMarkup(<Capture />);
  return captured!;
}

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

  it("Input onKeyDown (Enter) defers to an ancestor form instead of firing its own $action", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ submit: handler });
    const out = interactiveVocabulary.Input.render({
      name: "email",
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
            currentTarget: { value: string; form: unknown };
          }) => void;
        };
      }
    ).props.onKeyDown;
    onKeyDown({
      key: "Enter",
      nativeEvent: { isComposing: false },
      currentTarget: { value: "typed text", form: {} },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  type TextareaKeyDownEvent = {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    nativeEvent: { isComposing: boolean };
    currentTarget: {
      value: string;
      form: { requestSubmit: () => void } | null;
    };
    preventDefault: () => void;
  };

  it("Input multiline (textarea) Ctrl+Enter inside a form calls form.requestSubmit instead of firing its own $action", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ submit: handler });
    const out = interactiveVocabulary.Input.render({
      multiline: true,
      name: "notes",
      $status: "done",
      $action: { type: "submit" },
      $dispatch: registry.dispatch,
    }) as ReactNode;
    const onKeyDown = (
      out as { props: { onKeyDown: (e: TextareaKeyDownEvent) => void } }
    ).props.onKeyDown;
    const requestSubmit = vi.fn();
    const preventDefault = vi.fn();
    onKeyDown({
      key: "Enter",
      ctrlKey: true,
      metaKey: false,
      nativeEvent: { isComposing: false },
      currentTarget: { value: "typed text", form: { requestSubmit } },
      preventDefault,
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it("Input multiline (textarea) Ctrl+Enter without a form still fires its own $action", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ submit: handler });
    const out = interactiveVocabulary.Input.render({
      multiline: true,
      $status: "done",
      $action: { type: "submit" },
      $dispatch: registry.dispatch,
    }) as ReactNode;
    const onKeyDown = (
      out as { props: { onKeyDown: (e: TextareaKeyDownEvent) => void } }
    ).props.onKeyDown;
    const preventDefault = vi.fn();
    onKeyDown({
      key: "Enter",
      ctrlKey: true,
      metaKey: false,
      nativeEvent: { isComposing: false },
      currentTarget: { value: "typed text", form: null },
      preventDefault,
    });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({
      payload: { type: "submit", $input: "typed text" },
    });
  });

  it("Button with submit set renders no onClick handler, so it never fires $action on click", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ purchase: handler });
    const out = interactiveVocabulary.Button.render({
      label: "Buy",
      submit: true,
      $status: "done",
      $action: { type: "purchase" },
      $dispatch: registry.dispatch,
    } as ButtonRenderProps & { submit: boolean }) as ReactNode;
    expect(
      (out as { props: { onClick?: unknown } }).props.onClick,
    ).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("Button without submit keeps firing $action on click", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ purchase: handler });
    const out = interactiveVocabulary.Button.render({
      label: "Buy",
      $status: "done",
      $action: { type: "purchase" },
      $dispatch: registry.dispatch,
    } as ButtonRenderProps) as ReactNode;
    const onClick = (out as { props: { onClick: () => void } }).props.onClick;
    onClick();
    expect(handler).toHaveBeenCalledWith({ payload: { type: "purchase" } });
  });

  it("Checkbox onChange fires $dispatch with the checked boolean as $input", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ toggle: handler });
    const out = interactiveVocabulary.Checkbox.render({
      label: "Accept",
      $status: "done",
      $action: { type: "toggle" },
      $dispatch: registry.dispatch,
    }) as ReactElement;
    const input = (out.props as { children: ReactElement[] }).children[0];
    const onChange = (
      input as {
        props: {
          onChange: (e: { currentTarget: { checked: boolean } }) => void;
        };
      }
    ).props.onChange;
    onChange({ currentTarget: { checked: true } });
    expect(handler).toHaveBeenCalledWith({
      payload: { type: "toggle", $input: true },
    });
  });

  it("Checkbox onChange is a no-op when no $dispatch is wired", () => {
    const out = interactiveVocabulary.Checkbox.render({
      label: "Accept",
      $status: "done",
      $action: { type: "toggle" },
    }) as ReactElement;
    const input = (out.props as { children: ReactElement[] }).children[0];
    const onChange = (
      input as {
        props: {
          onChange: (e: { currentTarget: { checked: boolean } }) => void;
        };
      }
    ).props.onChange;
    expect(() => onChange({ currentTarget: { checked: true } })).not.toThrow();
  });

  it("RadioGroup onChange fires $dispatch with the option's value as $input", () => {
    const handler = vi.fn();
    const registry = createActionRegistry({ pick: handler });
    const out = renderWithHooks(() =>
      interactiveVocabulary.RadioGroup.render({
        $status: "done",
        $action: { type: "pick" },
        $dispatch: registry.dispatch,
        options: [
          { label: "Small", value: "sm" },
          { label: "Large", value: "lg" },
        ],
      }),
    );
    const options = (out.props as { children: ReactElement[] }).children;
    const secondRadio = (options[1]!.props as { children: ReactElement[] })
      .children[0] as ReactElement;
    const onChange = (secondRadio.props as { onChange: () => void }).onChange;
    onChange();
    expect(handler).toHaveBeenCalledWith({
      payload: { type: "pick", $input: "lg" },
    });
  });

  it("RadioGroup falls back to useId() for the shared radio name when name is omitted", () => {
    const out = renderWithHooks(() =>
      interactiveVocabulary.RadioGroup.render({
        $status: "done",
        options: [
          { label: "Small", value: "sm" },
          { label: "Large", value: "lg" },
        ],
      }),
    );
    const options = (out.props as { children: ReactElement[] }).children;
    const firstRadio = (options[0]!.props as { children: ReactElement[] })
      .children[0] as ReactElement;
    const secondRadio = (options[1]!.props as { children: ReactElement[] })
      .children[0] as ReactElement;
    const firstName = (firstRadio.props as { name: string }).name;
    const secondName = (secondRadio.props as { name: string }).name;
    expect(firstName).toBeTruthy();
    expect(firstName).toBe(secondName);
  });
});
