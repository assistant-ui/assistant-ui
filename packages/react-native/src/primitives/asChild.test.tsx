import {
  act,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { Pressable, Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComposerAddAttachment } from "./composer/ComposerAddAttachment";
import { ComposerCancel } from "./composer/ComposerCancel";
import { ComposerQuoteDismiss } from "./composer/ComposerQuoteDismiss";
import { ComposerSend } from "./composer/ComposerSend";

const h = vi.hoisted(() => ({
  calls: [] as string[],
  disabled: false,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useComposerAddAttachment: () => ({ disabled: h.disabled }),
  useComposerCancel: () => ({
    cancel: () => h.calls.push("cancel"),
    disabled: h.disabled,
  }),
  useComposerSend: () => ({
    send: () => h.calls.push("send"),
    disabled: h.disabled,
  }),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    composer: { setQuote: () => h.calls.push("setQuote") },
  }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) => {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

const primitives: ReadonlyArray<{
  name: string;
  action: string;
  hookDisabled: boolean;
  render: (
    child: ReactElement,
    ref?: Ref<ComponentRef<typeof Pressable>>,
  ) => ReactNode;
}> = [
  {
    name: "ComposerAddAttachment",
    action: "pick",
    hookDisabled: true,
    render: (child, ref) => (
      <ComposerAddAttachment
        asChild
        ref={ref}
        onPress={() => h.calls.push("pick")}
      >
        {child}
      </ComposerAddAttachment>
    ),
  },
  {
    name: "ComposerCancel",
    action: "cancel",
    hookDisabled: true,
    render: (child, ref) => (
      <ComposerCancel asChild ref={ref}>
        {child}
      </ComposerCancel>
    ),
  },
  {
    name: "ComposerQuoteDismiss",
    action: "setQuote",
    hookDisabled: false,
    render: (child, ref) => (
      <ComposerQuoteDismiss asChild ref={ref}>
        {child}
      </ComposerQuoteDismiss>
    ),
  },
  {
    name: "ComposerSend",
    action: "send",
    hookDisabled: true,
    render: (child, ref) => (
      <ComposerSend asChild ref={ref}>
        {child}
      </ComposerSend>
    ),
  },
];

const kitButton = (
  <Pressable testID="kit" onPress={() => h.calls.push("child")}>
    <Text>Kit</Text>
  </Pressable>
);

describe("react-native primitives with asChild", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.calls.length = 0;
    h.disabled = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mount = async (node: ReactNode) => {
    await act(async () => {
      root.render(node);
    });
    const buttons = container.querySelectorAll('[role="button"]');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.getAttribute("data-testid")).toBe("kit");
    return buttons[0]!;
  };

  for (const { name, action, hookDisabled, render } of primitives) {
    it(`${name} composes the wrapper and child refs`, async () => {
      const wrapperRef = vi.fn();
      const childRef = vi.fn();
      const el = await mount(
        render(
          <Pressable ref={childRef} testID="kit">
            <Text>Kit</Text>
          </Pressable>,
          wrapperRef,
        ),
      );

      expect(wrapperRef).toHaveBeenCalledWith(el);
      expect(childRef).toHaveBeenCalledWith(el);
    });

    it(`${name} renders the child as its only press target`, async () => {
      await mount(render(kitButton));
    });

    it(`${name} runs the child's onPress, then its own action`, async () => {
      const el = await mount(render(kitButton));

      await act(async () => click(el));

      expect(h.calls).toEqual(["child", action]);
    });

    if (hookDisabled) {
      it(`${name} disables the child while it is disabled`, async () => {
        h.disabled = true;
        const el = await mount(render(kitButton));

        await act(async () => click(el));

        expect(el.getAttribute("aria-disabled")).toBe("true");
        expect(h.calls).toEqual([]);
      });
    }
  }
});
