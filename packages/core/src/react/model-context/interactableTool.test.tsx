// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

const mocks = vi.hoisted(() => {
  const register = vi.fn(
    (_registration: { updateRender?: unknown }) => () => {},
  );
  return {
    register,
    aui: { unstable_interactables: { register } },
    state: {
      optional: { part: undefined as unknown },
      thread: { messages: [] as unknown[] },
    },
    methods: {
      setState: vi.fn(),
      isPending: false,
      error: undefined,
      flush: vi.fn(async () => undefined),
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}));

vi.mock("./useInteractableState", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useInteractableState")>()),
  unstable_useInteractableState: () => [undefined, mocks.methods],
}));

import { unstable_interactableTool } from "./interactableTool";

afterEach(cleanup);

type CreatingCallUI = ToolCallMessagePartComponent<
  Record<string, unknown>,
  { success: true; interactable?: string | undefined }
>;

const renderCreatingCall = async (
  toolName: string,
  name: string | undefined,
  encode: (result: unknown) => unknown = (result) => result,
) => {
  const draw = vi.fn(() => null);
  const tool = unstable_interactableTool({
    name,
    description: "A notepad the user can read and edit.",
    stateSchema: {
      type: "object",
      properties: { title: { type: "string" } },
    },
    render: draw,
  });
  const execute = tool.execute as (
    args: Record<string, unknown>,
  ) => Promise<unknown>;
  const args = { title: "Draft" };
  const part = {
    type: "tool-call",
    toolCallId: "call-1",
    toolName,
    args,
    result: encode(await execute(args)),
  };
  mocks.state.optional.part = part;
  mocks.state.thread.messages = [{ role: "assistant", content: [part] }];
  const ToolUI = tool.render as CreatingCallUI;
  render(<ToolUI {...(part as unknown as ComponentProps<CreatingCallUI>)} />);
  return draw;
};

describe("unstable_interactableTool", () => {
  it.each([
    { toolName: "notepad", name: undefined, form: "an object" },
    { toolName: "create_notepad", name: "notepad", form: "an object" },
    { toolName: "create_notepad", name: "notepad", form: "a JSON string" },
  ])(
    "creates the notepad interactable from a $toolName call whose result is $form",
    async ({ toolName, name, form }) => {
      const draw = await renderCreatingCall(
        toolName,
        name,
        form === "a JSON string"
          ? (result) => JSON.stringify(result)
          : undefined,
      );

      await waitFor(() =>
        expect(mocks.register).toHaveBeenLastCalledWith(
          expect.objectContaining({
            id: "call-1",
            name: "notepad",
            scope: "thread",
          }),
        ),
      );
      expect(draw).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: "call-1",
          version: expect.objectContaining({
            state: { title: "Draft" },
            isLatest: true,
          }),
        }),
      );
    },
  );

  it("registers an update call under `name`, which the update tool's name sanitizes", async () => {
    await renderCreatingCall("create_note_pad", "note pad");
    type UpdateCallUI = ToolCallMessagePartComponent<
      Record<string, unknown>,
      unknown
    >;
    const UpdateUI = mocks.register.mock.lastCall?.[0].updateRender as
      | UpdateCallUI
      | undefined;
    expect(UpdateUI).toBeDefined();
    const update = {
      type: "tool-call",
      toolCallId: "call-2",
      toolName: "update_note_pad",
      args: { id: "call-1", title: "Final" },
      result: { success: true, id: "call-1" },
    };
    mocks.state.optional.part = update;
    mocks.state.thread.messages.push({ role: "assistant", content: [update] });
    const Update = UpdateUI as UpdateCallUI;
    render(<Update {...(update as unknown as ComponentProps<UpdateCallUI>)} />);

    await waitFor(() =>
      expect(mocks.register).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: "call-1",
          name: "note pad",
          scope: "thread",
        }),
      ),
    );
  });
});
