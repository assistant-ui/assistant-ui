import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { JSONGenerativeUI as ClientGenUI } from "./JSONGenerativeUI.client";
import { JSONGenerativeUI as ServerGenUI } from "./JSONGenerativeUI.server";
import { defineGenerativeComponents } from "./defineGenerativeComponents";
import { createActionRegistry, type ActionRegistry } from "./actionRegistry";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "./types";

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

  it("does not complete prompt_user when the tool call already has a result", async () => {
    const addResult = vi.fn();
    const dispatch = captureActionDispatch(
      "promptUser",
      createActionRegistry({ answer: () => ({ choice: "new" }) }),
      { addResult, result: { choice: "existing" } },
    );

    dispatch({ type: "answer" });
    await Promise.resolve();
    expect(addResult).not.toHaveBeenCalled();
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
