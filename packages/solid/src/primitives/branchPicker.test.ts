import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import {
  BranchPickerPrimitiveCount,
  BranchPickerPrimitiveNext,
  BranchPickerPrimitiveNumber,
  BranchPickerPrimitivePrevious,
} from "./branchPicker";

type Message = { id: string; role: "user"; content: string };

const createTestRuntime = (supportsSwitching = true) => {
  let messages: readonly Message[] = [
    { id: "u1", role: "user", content: "first" },
  ];
  let isRunning = false;
  const makeAdapter = (): ExternalStoreAdapter<Message> => ({
    messages,
    isRunning,
    convertMessage: (message) => message,
    onNew: async () => {},
    onEdit: async () => {
      messages = [{ id: "u2", role: "user", content: "second" }];
      core.setAdapter(makeAdapter());
    },
    ...(supportsSwitching && {
      setMessages: (next: readonly Message[]) => {
        messages = next;
        core.setAdapter(makeAdapter());
      },
    }),
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  return {
    runtime,
    branch: async () => {
      const composer = runtime.thread.getMessageByIndex(0).composer;
      flushTapSync(() => {
        composer.beginEdit();
        composer.setText("second");
        composer.send();
      });
      await vi.waitFor(() =>
        expect(runtime.thread.getState().messages[0]!.id).toBe("u2"),
      );
      flushTapSync(() => {});
    },
    setRunning: (value: boolean) => {
      isRunning = value;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
  };
};

const disposers: (() => void)[] = [];
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()));

const mount = (runtime: AssistantRuntimeImpl, view: () => JSX.Element) => {
  const el = document.createElement("div");
  document.body.append(el);
  const Scope = () =>
    createComponent(AuiProvider, {
      config: AuiConfig({
        message: Derived({
          source: "thread",
          query: { type: "index", index: 0 },
          get: (aui) => aui.thread.message({ index: 0 }),
        }),
      }),
      extends: useAui(),
      get children() {
        return createComponent(view, {});
      },
    });
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(Scope, {});
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return el;
};

const directions = [
  {
    name: "previous",
    Component: BranchPickerPrimitivePrevious,
    initial: "u2",
    target: "u1",
  },
  {
    name: "next",
    Component: BranchPickerPrimitiveNext,
    initial: "u1",
    target: "u2",
  },
] as const;

const prepare = async (name: "previous" | "next") => {
  const fixture = createTestRuntime();
  await fixture.branch();
  if (name === "next")
    flushTapSync(() =>
      fixture.runtime.thread
        .getMessageByIndex(0)
        .switchToBranch({ position: "previous" }),
    );
  return fixture;
};

describe("branch picker primitives", () => {
  it("disables both directions and renders 1/1 on a single branch", () => {
    const { runtime } = createTestRuntime();
    const el = mount(runtime, () => [
      createComponent(BranchPickerPrimitivePrevious, {}),
      createComponent(BranchPickerPrimitiveNumber, {}),
      "/",
      createComponent(BranchPickerPrimitiveCount, {}),
      createComponent(BranchPickerPrimitiveNext, {}),
    ]);
    expect(el.textContent).toBe("1/1");
    for (const button of el.querySelectorAll("button")) {
      expect(button.disabled).toBe(true);
      button.disabled = false;
      flushTapSync(() => button.click());
    }
    expect(el.textContent).toBe("1/1");
    expect(runtime.thread.getState().messages[0]!.id).toBe("u1");
    expect(
      [...el.childNodes].filter((node) => node.nodeType === Node.ELEMENT_NODE),
    ).toHaveLength(2);
  });

  it("updates the text number and count through branch creation and navigation", async () => {
    const { runtime, branch } = createTestRuntime();
    const el = mount(runtime, () => [
      createComponent(BranchPickerPrimitiveNumber, {}),
      "/",
      createComponent(BranchPickerPrimitiveCount, {}),
    ]);
    expect(el.textContent).toBe("1/1");
    expect(el.children).toHaveLength(0);
    await branch();
    expect(el.textContent).toBe("2/2");
    flushTapSync(() =>
      runtime.thread
        .getMessageByIndex(0)
        .switchToBranch({ position: "previous" }),
    );
    expect(el.textContent).toBe("1/2");
    expect(el.children).toHaveLength(0);
  });

  it.each(directions)(
    "navigates $name and blocks the boundary even if forcibly enabled",
    async ({ name, Component, target }) => {
      const { runtime } = await prepare(name);
      const el = mount(runtime, () =>
        createComponent(Component, { disabled: false }),
      );
      const button = el.querySelector("button")!;
      expect(button.disabled).toBe(false);
      flushTapSync(() => button.click());
      expect(runtime.thread.getState().messages[0]!.id).toBe(target);
      expect(button.disabled).toBe(true);
      button.disabled = false;
      flushTapSync(() => button.click());
      expect(runtime.thread.getState().messages[0]!.id).toBe(target);
    },
  );

  it.each(directions)(
    "blocks $name while running and re-enables after the run",
    async ({ name, Component, initial, target }) => {
      const { runtime, setRunning } = await prepare(name);
      const el = mount(runtime, () => createComponent(Component, {}));
      const button = el.querySelector("button")!;
      expect(button.disabled).toBe(false);
      setRunning(true);
      expect(button.disabled).toBe(true);
      button.disabled = false;
      flushTapSync(() => button.click());
      expect(runtime.thread.getState().messages[0]!.id).toBe(initial);
      setRunning(false);
      expect(button.disabled).toBe(false);
      flushTapSync(() => button.click());
      expect(runtime.thread.getState().messages[0]!.id).toBe(target);
    },
  );

  it.each(directions)(
    "blocks unsupported $name navigation",
    async ({ Component }) => {
      const { runtime, branch } = createTestRuntime(false);
      await branch();
      const el = mount(runtime, () =>
        createComponent(Component, { disabled: false }),
      );
      const button = el.querySelector("button")!;
      expect(button.disabled).toBe(true);
      button.disabled = false;
      expect(() => flushTapSync(() => button.click())).not.toThrow();
      expect(runtime.thread.getState().messages[0]!.id).toBe("u2");
    },
  );

  it.each(directions)(
    "honors live disabled props for $name after the DOM is forcibly enabled",
    async ({ name, Component, initial, target }) => {
      const { runtime } = await prepare(name);
      const [disabled, setDisabled] = createSignal(true);
      const el = mount(runtime, () =>
        createComponent(Component, {
          get disabled() {
            return disabled();
          },
        }),
      );
      const button = el.querySelector("button")!;
      expect(button.disabled).toBe(true);
      button.disabled = false;
      flushTapSync(() => button.click());
      expect(runtime.thread.getState().messages[0]!.id).toBe(initial);
      setDisabled(false);
      expect(button.disabled).toBe(false);
      flushTapSync(() => button.click());
      expect(runtime.thread.getState().messages[0]!.id).toBe(target);
    },
  );

  it.each(
    directions.flatMap((direction) =>
      [false, true].map((bound) => ({ ...direction, bound })),
    ),
  )(
    "runs the caller first and honors its veto ($name, bound=$bound)",
    async ({ name, Component, initial, target, bound }) => {
      const { runtime } = await prepare(name);
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((event: MouseEvent) => {
        expect(runtime.thread.getState().messages[0]!.id).toBe(initial);
        if (veto()) event.preventDefault();
      });
      const boundHandler = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const el = mount(runtime, () =>
        createComponent(Component, {
          onClick: bound ? [boundHandler, "caller"] : handler,
        }),
      );
      const button = el.querySelector("button")!;
      flushTapSync(() => button.click());
      expect(handler).toHaveBeenCalledOnce();
      expect(runtime.thread.getState().messages[0]!.id).toBe(initial);
      setVeto(false);
      flushTapSync(() => button.click());
      expect(handler).toHaveBeenCalledTimes(2);
      expect(runtime.thread.getState().messages[0]!.id).toBe(target);
    },
  );

  it.each(directions)(
    "keeps the $name caller delegated after descendant handlers",
    async ({ name, Component, initial }) => {
      const { runtime } = await prepare(name);
      const order: string[] = [];
      const el = mount(runtime, () =>
        createComponent(Component, {
          onClick: (event) => {
            order.push(event.defaultPrevented ? "caller:prevented" : "caller");
          },
          get children() {
            return createComponent(Dynamic, {
              component: "span",
              children: "Switch",
              onClick: (event: MouseEvent) => {
                order.push("child");
                event.preventDefault();
              },
            });
          },
        }),
      );
      flushTapSync(() => el.querySelector("span")!.click());
      expect(order).toEqual(["child", "caller:prevented"]);
      expect(runtime.thread.getState().messages[0]!.id).toBe(initial);
    },
  );

  it.each(directions)(
    "forwards $name refs and reactive attributes and children",
    async ({ name, Component }) => {
      const { runtime } = await prepare(name);
      const ref = vi.fn();
      const [label, setLabel] = createSignal("Switch");
      const el = mount(runtime, () =>
        createComponent(Component, {
          ref,
          class: "branch",
          get "aria-label"() {
            return label();
          },
          get children() {
            return label();
          },
        }),
      );
      const button = el.querySelector("button")!;
      expect(button.type).toBe("button");
      expect(button.className).toBe("branch");
      expect(button.textContent).toBe("Switch");
      expect(ref.mock.calls[0]![0]).toBe(button);
      setLabel("Switch branch");
      expect(button.textContent).toBe("Switch branch");
      expect(button.getAttribute("aria-label")).toBe("Switch branch");
    },
  );
});
