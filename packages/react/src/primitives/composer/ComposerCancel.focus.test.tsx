/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import * as coreReact from "@assistant-ui/core/react";
import type { ThreadMessageLike } from "@assistant-ui/core";
import { ComposerPrimitiveRoot } from "./ComposerRoot";
import { ComposerPrimitiveInput } from "./ComposerInput";
import { ComposerPrimitiveCancel } from "./ComposerCancel";
import { ThreadPrimitiveRoot } from "../thread/ThreadRoot";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { ActionBarPrimitiveEdit } from "../actionBar/ActionBarEdit";

const messages = [{ id: "user-message", text: "Original message" }];
const convertMessage = (
  message: (typeof messages)[number],
): ThreadMessageLike => ({
  id: message.id,
  role: "user",
  content: [{ type: "text", text: message.text }],
});

const Provider = ({
  children,
  isRunning = false,
  onCancel,
}: PropsWithChildren<{
  isRunning?: boolean;
  onCancel?: () => Promise<void>;
}>) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage,
    onNew: async () => {},
    onEdit: async () => {},
    isRunning,
    onCancel,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const Message = () => (
  <ActionBarPrimitiveEdit>Edit message</ActionBarPrimitiveEdit>
);

type Options = {
  nonForm?: boolean;
  disabledMain?: boolean;
  showMain?: boolean;
  contentEditable?: boolean;
  beforeMain?: ReactNode;
  onCancelClick?: ComponentProps<typeof ComposerPrimitiveCancel>["onClick"];
};

const setup = ({
  nonForm,
  disabledMain,
  showMain = true,
  contentEditable,
  beforeMain,
  onCancelClick,
}: Options = {}) => {
  const EditComposer = () => (
    <ComposerPrimitiveRoot render={nonForm ? <div /> : undefined}>
      <ComposerPrimitiveInput aria-label="Edit composer" autoFocus />
      <ComposerPrimitiveCancel onClick={onCancelClick}>
        Cancel edit
      </ComposerPrimitiveCancel>
    </ComposerPrimitiveRoot>
  );
  render(
    <Provider>
      <input aria-label="Outside thread" />
      <ThreadPrimitiveRoot>
        <ThreadPrimitiveViewportProvider>
          <ThreadPrimitiveMessages components={{ Message, EditComposer }} />
          {beforeMain}
          {showMain && (
            <ComposerPrimitiveRoot render={nonForm ? <section /> : undefined}>
              {contentEditable ? (
                <div
                  role="textbox"
                  aria-label="Main composer"
                  contentEditable
                />
              ) : (
                <ComposerPrimitiveInput
                  aria-label="Main composer"
                  disabled={disabledMain}
                />
              )}
            </ComposerPrimitiveRoot>
          )}
        </ThreadPrimitiveViewportProvider>
      </ThreadPrimitiveRoot>
    </Provider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
  const input = screen.getByRole("textbox", { name: "Edit composer" });
  act(() => input.focus());
  return { input, cancel: screen.getByRole("button", { name: "Cancel edit" }) };
};

afterEach(() => vi.restoreAllMocks());

describe("edit composer cancellation focus", () => {
  it.each(["Escape", "Cancel"])(
    "returns focus to the main composer after %s",
    (action) => {
      const { input, cancel } = setup();
      if (action === "Escape") {
        fireEvent.keyDown(input, { key: "Escape" });
      } else {
        act(() => cancel.focus());
        fireEvent.click(cancel);
      }
      expect(
        screen.queryByRole("textbox", { name: "Edit composer" }),
      ).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Main composer" }),
      );
    },
  );

  it("supports non-form composer roots and a contenteditable destination", () => {
    const { input } = setup({ nonForm: true, contentEditable: true });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Main composer" }),
    );
  });

  it("does not focus a nested thread's composer", () => {
    const { input } = setup({
      beforeMain: (
        <Provider>
          <ThreadPrimitiveRoot>
            <ComposerPrimitiveRoot>
              <textarea aria-label="Nested composer" />
            </ComposerPrimitiveRoot>
          </ThreadPrimitiveRoot>
        </Provider>
      ),
    });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Main composer" }),
    );
  });

  it.each(["hidden", "inert"] as const)(
    "skips a %s main composer before the usable destination",
    (attribute) => {
      const { input } = setup({
        beforeMain: (
          <ComposerPrimitiveRoot {...{ [attribute]: true }}>
            <textarea aria-label="Unavailable composer" />
          </ComposerPrimitiveRoot>
        ),
      });
      fireEvent.keyDown(input, { key: "Escape" });
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Main composer" }),
      );
    },
  );

  it.each([{ showMain: false }, { disabledMain: true }])(
    "cancels safely without a usable destination: %j",
    (options) => {
      const { input } = setup(options);
      fireEvent.keyDown(input, { key: "Escape" });
      expect(
        screen.queryByRole("textbox", { name: "Edit composer" }),
      ).toBeNull();
      expect(document.activeElement).toBe(document.body);
    },
  );

  it("preserves focus deliberately moved by the consumer", () => {
    const { cancel } = setup({
      onCancelClick: () =>
        screen.getByRole("textbox", { name: "Outside thread" }).focus(),
    });
    act(() => cancel.focus());
    fireEvent.click(cancel);
    expect(screen.queryByRole("textbox", { name: "Edit composer" })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Outside thread" }),
    );
  });

  it("does not cancel or restore focus when the consumer prevents the action", () => {
    const { cancel } = setup({
      onCancelClick: (event) => event.preventDefault(),
    });
    act(() => cancel.focus());
    fireEvent.click(cancel);
    expect(
      screen.queryByRole("textbox", { name: "Edit composer" }),
    ).not.toBeNull();
    expect(document.activeElement).toBe(cancel);
  });

  it("leaves focus and editing unchanged when cancellation throws", () => {
    const error = new Error("Cancellation failed");
    const cancel = vi.fn(() => {
      throw error;
    });
    vi.spyOn(coreReact, "useComposerCancel").mockReturnValue({
      disabled: false,
      cancel,
    });
    const { input } = setup();
    const onError = (event: ErrorEvent) => {
      if (event.error === error) event.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      fireEvent.keyDown(input, { key: "Escape" });
      expect(cancel).toHaveBeenCalledOnce();
      expect(screen.getByRole("textbox", { name: "Edit composer" })).toBe(
        input,
      );
      expect(document.activeElement).toBe(input);
    } finally {
      window.removeEventListener("error", onError);
    }
  });

  it("does not move focus when cancelling a running thread", () => {
    const onCancel = vi.fn(async () => {});
    render(
      <Provider isRunning onCancel={onCancel}>
        <ThreadPrimitiveRoot>
          <ComposerPrimitiveRoot>
            <textarea aria-label="Main composer" />
            <ComposerPrimitiveCancel>Stop run</ComposerPrimitiveCancel>
          </ComposerPrimitiveRoot>
        </ThreadPrimitiveRoot>
      </Provider>,
    );
    const cancel = screen.getByRole("button", { name: "Stop run" });
    act(() => cancel.focus());
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(cancel);
  });
});
