/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { parsePartialJsonObject } from "assistant-stream/utils";
import { JSONGenerativeUI as ClientGenUI } from "./JSONGenerativeUI.client";
import { JSONGenerativeUI as ServerGenUI } from "./JSONGenerativeUI.server";
import { defineGenerativeComponents } from "./defineGenerativeComponents";
import { createActionRegistry, type ActionRegistry } from "./actionRegistry";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "./types";
import { defaultGenerativeUILibrary } from "./vocabulary";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const library: GenerativeUILibrary = {
  Card: {
    description: "A card.",
    properties: z.object({ title: z.string() }),
    render: ({ title, children }: any) => (
      <section data-title={title}>{children}</section>
    ),
  },
  Button: {
    description: "A button.",
    properties: z.object({ label: z.string() }),
    render: ({ label }: any) => <button>{label}</button>,
  },
};

const renderTool = (
  tool: any,
  args: unknown,
  props: Record<string, unknown> = {},
) =>
  renderToStaticMarkup(
    <>{tool.render({ args, status: { type: "complete" }, ...props })}</>,
  );

const captureActionDispatch = (
  toolType: "present" | "promptUser",
  actions: ActionRegistry | undefined,
  props: Record<string, unknown> = {},
): GenerativeUIDispatch => {
  let dispatch: GenerativeUIDispatch | undefined;
  const ui = new ClientGenUI({
    library: {
      Action: {
        description: "An action target.",
        properties: z.object({}),
        render: ({ $dispatch }: any) => {
          dispatch = $dispatch;
          return null;
        },
      },
    },
    ...(actions ? { actions } : {}),
  });

  renderTool(
    toolType === "present" ? ui.present() : ui.promptUser(),
    { $type: "Action", $action: { type: "answer" } },
    props,
  );
  if (!dispatch) throw new Error("Expected an action dispatch.");
  return dispatch;
};

describe("JSONGenerativeUI — client build", () => {
  const ui = new ClientGenUI({ library });

  it("present is a frontend tool with matching parameters, render, and execute", () => {
    const tool = ui.present();
    expect(tool.type).toBe("frontend");
    expect(typeof tool.execute).toBe("function");
    expect(typeof tool.render).toBe("function");
    expect(tool.unstable_backendDefault).toEqual({ parameters: true });
    expect((tool.parameters as any).properties.$type.enum).toEqual([
      "Card",
      "Button",
    ]);
  });

  it("present renders the model's tree against the library", () => {
    const html = renderTool(ui.present(), { $type: "Card", title: "Hi" });
    expect(html).toContain('<section data-title="Hi"></section>');
  });

  it("wraps the tree so top-level siblings are spaced by the surface", () => {
    const html = renderTool(ui.present(), [
      { $type: "Card", title: "One" },
      { $type: "Card", title: "Two" },
    ]);
    expect(html.match(/data-aui="root"/g)).toHaveLength(1);
    expect(html.indexOf('data-title="One"')).toBeLessThan(
      html.indexOf('data-title="Two"'),
    );
  });

  it("leaves the surface childless until the stream produces a node", () => {
    // `:empty` is what hides it, so the contract is that it has no children.
    expect(renderTool(ui.present(), undefined)).toBe(
      '<div data-aui="root"></div>',
    );
    expect(renderTool(ui.present(), [])).toBe('<div data-aui="root"></div>');
  });

  it("prompt_user is a human tool that renders the tree (no execute)", () => {
    const tool = ui.promptUser();
    expect(tool.type).toBe("human");
    expect(tool.unstable_backendDefault).toEqual({ parameters: true });
    expect((tool as any).execute).toBeUndefined();
    const html = renderTool(tool, { $type: "Button", label: "ok" });
    expect(html).toContain("<button>ok</button>");
  });

  it("leaves present output live when the tool call has a result", () => {
    const interactive = new ClientGenUI({
      library: defaultGenerativeUILibrary,
    });
    const html = renderTool(
      interactive.present(),
      { $type: "Input", name: "note", defaultValue: "model default" },
      {
        result: { submitted: true },
        unstable_interactions: {
          entries: [
            {
              type: "action",
              occurredAt: 1,
              payload: { $input: { note: "submitted" } },
            },
          ],
        },
      },
    );

    expect(html).not.toContain('data-aui="answered"');
    expect(html).toContain('value="model default"');
  });

  it("locks an answered prompt without recorded actions at its defaults", () => {
    const interactive = new ClientGenUI({
      library: defaultGenerativeUILibrary,
    });
    const html = renderTool(
      interactive.promptUser(),
      { $type: "Input", name: "note", defaultValue: "model default" },
      { result: { submitted: true } },
    );

    expect(html).toContain('<fieldset disabled="" data-aui="answered">');
    expect(html).toContain('value="model default"');
  });

  it("locks an answered prompt and restores submitted Form values", async () => {
    const handler = vi.fn();
    const interactive = new ClientGenUI({
      library: defaultGenerativeUILibrary,
      actions: createActionRegistry({ save: handler }),
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          (interactive.promptUser() as any).render({
            args: {
              $type: "Form",
              $action: { type: "save" },
              children: [
                {
                  $type: "Input",
                  name: "message",
                  defaultValue: "model message",
                },
                {
                  $type: "Select",
                  name: "role",
                  defaultValue: "viewer",
                  options: [
                    { label: "Viewer", value: "viewer" },
                    { label: "Editor", value: "editor" },
                  ],
                },
                {
                  $type: "DatePicker",
                  name: "date",
                  value: "2026-01-01",
                },
                {
                  $type: "Checkbox",
                  name: "updates",
                  label: "Updates",
                  defaultChecked: false,
                },
                {
                  $type: "RadioGroup",
                  name: "plan",
                  defaultValue: "basic",
                  options: [
                    { label: "Basic", value: "basic" },
                    { label: "Pro", value: "pro" },
                  ],
                },
                {
                  $type: "CheckboxGroup",
                  name: "toppings",
                  defaultValue: ["olives"],
                  options: [
                    { label: "Basil", value: "basil" },
                    { label: "Olives", value: "olives" },
                    { label: "Onion", value: "onion" },
                  ],
                },
                { $type: "Button", label: "Save", submit: true },
              ],
            },
            status: { type: "complete" },
            toolCallId: "answered-form",
            toolName: "prompt_user",
            argsText: "",
            addResult: vi.fn(),
            result: { saved: true },
            unstable_interactions: {
              entries: [
                {
                  type: "action",
                  occurredAt: 1,
                  payload: { $input: { message: "older value" } },
                },
                {
                  type: "action",
                  occurredAt: 2,
                  payload: {
                    $input: {
                      message: "submitted message",
                      role: "editor",
                      date: "2026-02-03",
                      updates: true,
                      plan: "pro",
                      toppings: ["basil", "onion"],
                    },
                  },
                },
              ],
            },
          }),
        );
      });

      const answered = container.querySelector('fieldset[data-aui="answered"]');
      const form = container.querySelector("form");
      const message = container.querySelector<HTMLInputElement>(
        'input[name="message"]',
      );
      const role = container.querySelector<HTMLSelectElement>(
        'select[name="role"]',
      );
      const date =
        container.querySelector<HTMLInputElement>('input[name="date"]');
      const updates = container.querySelector<HTMLInputElement>(
        'input[name="updates"]',
      );
      const pro = container.querySelector<HTMLInputElement>(
        'input[type="radio"][value="pro"]',
      );
      const toppings = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[name="toppings"]'),
      );
      const button = container.querySelector("button");
      if (
        !answered ||
        !form ||
        !message ||
        !role ||
        !date ||
        !updates ||
        !pro ||
        !button
      ) {
        throw new Error("Expected answered prompt controls to render.");
      }

      expect(message.value).toBe("submitted message");
      expect(role.value).toBe("editor");
      expect(date.value).toBe("2026-02-03");
      expect(updates.checked).toBe(true);
      expect(pro.checked).toBe(true);
      expect(toppings.map((input) => input.checked)).toEqual([
        true,
        false,
        true,
      ]);
      for (const control of [
        ...container.querySelectorAll("input, select, textarea, button"),
      ]) {
        expect(control.matches(":disabled")).toBe(true);
      }

      await act(async () => {
        button.click();
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      });

      expect(handler).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("keeps an unanswered prompt live", async () => {
    const handler = vi.fn();
    const interactive = new ClientGenUI({
      library: defaultGenerativeUILibrary,
      actions: createActionRegistry({ save: handler }),
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          (interactive.promptUser() as any).render({
            args: {
              $type: "Button",
              label: "Save",
              $action: { type: "save" },
            },
            status: { type: "complete" },
            toolCallId: "unanswered-button",
            toolName: "prompt_user",
            argsText: "",
            addResult: vi.fn(),
          }),
        );
      });

      const button = container.querySelector("button");
      if (!button) throw new Error("Expected an unanswered prompt button.");
      expect(container.querySelector('[data-aui="answered"]')).toBeNull();
      await act(async () => button.click());
      expect(handler).toHaveBeenCalledWith({ payload: { type: "save" } });
    } finally {
      await act(async () => root.unmount());
    }
  });

  it.each(["running", "incomplete"])(
    "holds prompt controls back for %s arguments",
    (type) => {
      expect(
        renderTool(
          ui.promptUser(),
          { $type: "Button", label: "Answer" },
          { status: { type } },
        ),
      ).toBe('<div data-aui="root"></div>');
    },
  );

  it("holds back a pending prompt whose cancelled argument stream is partial", () => {
    const args = parsePartialJsonObject('{"$type":"Button","label":"Ans');
    expect(
      renderTool(ui.promptUser(), args, {
        status: { type: "requires-action", reason: "tool-calls" },
      }),
    ).toBe('<div data-aui="root"></div>');
    expect(
      renderTool(
        ui.promptUser(),
        parsePartialJsonObject('{"$type":"Button","label":"Answer"}'),
        { status: { type: "requires-action", reason: "tool-calls" } },
      ),
    ).toContain("<button>Answer</button>");
  });

  it("records actions before dispatching them without waiting for recording", () => {
    const recording = vi.fn(() => new Promise<void>(() => {}));
    const handler = vi.fn(() => "accepted");
    const dispatch = captureActionDispatch(
      "present",
      createActionRegistry({ answer: handler }),
      { unstable_recordInteraction: recording },
    );
    const action = { type: "answer", $input: { choice: "yes" } };

    expect(dispatch(action)).toBe("accepted");
    expect(recording).toHaveBeenCalledWith({
      type: "action",
      payload: action,
    });
    expect(handler).toHaveBeenCalledWith({ payload: action });
    expect(recording.mock.invocationCallOrder[0]).toBeLessThan(
      handler.mock.invocationCallOrder[0]!,
    );
  });

  it("keeps dispatch intact when action recording rejects", async () => {
    const recording = vi.fn(() => Promise.reject(new Error("unavailable")));
    const handler = vi.fn(() => "accepted");
    const dispatch = captureActionDispatch(
      "present",
      createActionRegistry({ answer: handler }),
      { unstable_recordInteraction: recording },
    );
    const action = { type: "answer" };

    expect(dispatch(action)).toBe("accepted");
    await Promise.resolve();
    expect(handler).toHaveBeenCalledWith({ payload: action });
  });

  it("keeps dispatch intact when action recording is unavailable", () => {
    const handler = vi.fn(() => "accepted");
    const dispatch = captureActionDispatch(
      "present",
      createActionRegistry({ answer: handler }),
    );
    const action = { type: "answer" };

    expect(dispatch(action)).toBe("accepted");
    expect(handler).toHaveBeenCalledWith({ payload: action });
  });

  it("does not record actions when no registry is configured", () => {
    const recording = vi.fn(() => Promise.resolve());
    let dispatch: GenerativeUIDispatch | undefined;
    const ui = new ClientGenUI({
      library: {
        Action: {
          description: "An action target.",
          properties: z.object({}),
          render: ({ $dispatch }: any) => {
            dispatch = $dispatch;
            return null;
          },
        },
      },
    });

    renderTool(
      ui.present(),
      { $type: "Action", $action: { type: "answer" } },
      { unstable_recordInteraction: recording },
    );

    expect(dispatch).toBeUndefined();
    expect(recording).not.toHaveBeenCalled();
  });

  it("completes prompt_user with a synchronous action result", async () => {
    const addResult = vi.fn();
    const dispatch = captureActionDispatch(
      "promptUser",
      createActionRegistry({ answer: () => ({ choice: "yes" }) }),
      { addResult },
    );

    expect(dispatch({ type: "answer" })).toEqual({ choice: "yes" });
    await Promise.resolve();
    expect(addResult).toHaveBeenCalledWith({ choice: "yes" });
  });

  it("completes prompt_user with an asynchronous action result", async () => {
    const addResult = vi.fn();
    const response = Promise.resolve({ choice: "yes" });
    const dispatch = captureActionDispatch(
      "promptUser",
      createActionRegistry({ answer: () => response }),
      { addResult },
    );

    expect(dispatch({ type: "answer" })).toBe(response);
    await response;
    await Promise.resolve();
    expect(addResult).toHaveBeenCalledWith({ choice: "yes" });
  });

  it("completes prompt_user once when delayed action results overlap", async () => {
    const addResult = vi.fn();
    let resolveFirst!: (response: { choice: string }) => void;
    let resolveSecond!: (response: { choice: string }) => void;
    const first = new Promise<{ choice: string }>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<{ choice: string }>((resolve) => {
      resolveSecond = resolve;
    });
    const responses = [first, second];
    const dispatch = captureActionDispatch(
      "promptUser",
      createActionRegistry({ answer: () => responses.shift() }),
      { addResult },
    );

    const firstAction = dispatch({ type: "answer", choice: "first" });
    const secondAction = dispatch({ type: "answer", choice: "second" });
    resolveFirst({ choice: "first" });
    await firstAction;
    await Promise.resolve();
    resolveSecond({ choice: "second" });
    await secondAction;
    await Promise.resolve();

    expect(addResult).toHaveBeenCalledTimes(1);
    expect(addResult).toHaveBeenCalledWith({ choice: "first" });
  });

  it("does not complete prompt_user when the action result is undefined", async () => {
    const addResult = vi.fn();
    const dispatch = captureActionDispatch(
      "promptUser",
      createActionRegistry({ answer: () => undefined }),
      { addResult },
    );

    expect(dispatch({ type: "answer" })).toBeUndefined();
    await Promise.resolve();
    expect(addResult).not.toHaveBeenCalled();
  });

  it("does not complete prompt_user when the action handler rejects", async () => {
    const addResult = vi.fn();
    const response = Promise.reject(new Error("rejected"));
    const dispatch = captureActionDispatch(
      "promptUser",
      createActionRegistry({ answer: () => response }),
      { addResult },
    );

    await expect(Promise.resolve(dispatch({ type: "answer" }))).rejects.toThrow(
      "rejected",
    );
    await Promise.resolve();
    expect(addResult).not.toHaveBeenCalled();
  });

  it("does not provide an action dispatch when prompt_user already has a result", () => {
    let dispatch: GenerativeUIDispatch | undefined;
    const ui = new ClientGenUI({
      library: {
        Action: {
          description: "An action target.",
          properties: z.object({}),
          render: ({ $dispatch }: any) => {
            dispatch = $dispatch;
            return null;
          },
        },
      },
      actions: createActionRegistry({ answer: vi.fn() }),
    });

    renderTool(
      ui.promptUser(),
      { $type: "Action", $action: { type: "answer" } },
      { result: { choice: "existing" } },
    );

    expect(dispatch).toBeUndefined();
  });

  it("never completes present from an action result", async () => {
    const addResult = vi.fn();
    const dispatch = captureActionDispatch(
      "present",
      createActionRegistry({ answer: () => ({ choice: "yes" }) }),
      { addResult },
    );

    dispatch({ type: "answer" });
    await Promise.resolve();
    expect(addResult).not.toHaveBeenCalled();
  });

  it.each(["complete", "requires-action"])(
    "completes %s prompt_user form submissions with named field values",
    async (type) => {
      const addResult = vi.fn();
      const handler = vi.fn(() => ({ submitted: true }));
      const ui = new ClientGenUI({
        library: defaultGenerativeUILibrary,
        actions: createActionRegistry({ submit: handler }),
      });
      const container = document.createElement("div");
      const root = createRoot(container);

      try {
        await act(async () => {
          root.render(
            (ui.promptUser() as any).render({
              args: {
                $type: "Form",
                $action: { type: "submit" },
                children: [
                  { $type: "Input", name: "email" },
                  { $type: "Checkbox", name: "updates", label: "Updates" },
                ],
              },
              status: {
                type,
                ...(type === "requires-action" ? { reason: "tool-calls" } : {}),
              },
              toolCallId: "prompt-form",
              toolName: "prompt_user",
              argsText: "",
              addResult,
            }),
          );
        });

        const form = container.querySelector("form");
        const email = container.querySelector<HTMLInputElement>(
          'input[name="email"]',
        );
        const updates = container.querySelector<HTMLInputElement>(
          'input[name="updates"]',
        );
        if (!form || !email || !updates) {
          throw new Error("Expected the prompt form fields to render.");
        }

        email.value = "ada@example.com";
        updates.checked = true;
        let submitted = true;
        await act(async () => {
          submitted = form.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
          await Promise.resolve();
        });

        expect(submitted).toBe(false);
        expect(handler).toHaveBeenCalledWith({
          payload: {
            type: "submit",
            $input: { email: "ada@example.com", updates: true },
          },
        });
        expect(addResult).toHaveBeenCalledWith({ submitted: true });
      } finally {
        await act(async () => root.unmount());
      }
    },
  );
});

describe("JSONGenerativeUI — server build", () => {
  const ui = new ServerGenUI({ library });

  it("present carries only schema (no render/execute) and matches the client schema", () => {
    const tool = ui.present() as any;
    expect(tool.type).toBe("frontend");
    expect(tool.render).toBeUndefined();
    expect(tool.execute).toBeUndefined();
    expect(tool.unstable_backendDefault).toBeUndefined();
    expect(tool.parameters.properties.$type.enum).toEqual(["Card", "Button"]);
    expect(tool.parameters).toEqual(
      new ClientGenUI({ library }).present().parameters,
    );
  });

  it("prompt_user carries only schema (no render)", () => {
    const tool = ui.promptUser() as any;
    expect(tool.type).toBe("human");
    expect(tool.render).toBeUndefined();
    expect(tool.unstable_backendDefault).toBeUndefined();
    expect(tool.parameters.properties.$type.enum).toEqual(["Card", "Button"]);
  });
});

describe("defineGenerativeComponents", () => {
  it("throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => defineGenerativeComponents({})).toThrow(
      /no runtime implementation/,
    );
  });
});
