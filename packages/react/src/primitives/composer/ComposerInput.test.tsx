// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "../../legacy-runtime/AssistantRuntimeProvider";
import { useAssistantRuntime } from "../../legacy-runtime/hooks/AssistantContext";
import { useLocalRuntime } from "../../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter } from "../../index";
import { ComposerPrimitiveInput } from "./ComposerInput";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const RuntimeProvider: FC<PropsWithChildren> = ({ children }) => {
  const runtime = useLocalRuntime(noOpAdapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const RuntimeCapture: FC<{
  runtimeRef: { current: AssistantRuntime | null };
}> = ({ runtimeRef }) => {
  runtimeRef.current = useAssistantRuntime();
  return null;
};

const renderInput = () => {
  const runtimeRef: { current: AssistantRuntime | null } = { current: null };
  render(
    <RuntimeProvider>
      <ComposerPrimitiveInput aria-label="Message" />
      <RuntimeCapture runtimeRef={runtimeRef} />
    </RuntimeProvider>,
  );
  return runtimeRef;
};

const setNativeInputValue = (element: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(element, value);
};

const input = (
  element: HTMLTextAreaElement,
  value: string,
  init?: { isComposing?: boolean; inputType?: string },
) => {
  setNativeInputValue(element, value);
  fireEvent(
    element,
    new InputEvent("input", {
      bubbles: true,
      data: value,
      inputType: init?.inputType ?? "insertText",
      isComposing: init?.isComposing ?? false,
    }),
  );
};

describe("ComposerPrimitive.Input", () => {
  it("recovers when compositionend is dropped before the next input", () => {
    const runtimeRef = renderInput();
    const textarea = screen.getByRole("textbox", {
      name: "Message",
    }) as HTMLTextAreaElement;

    fireEvent.compositionStart(textarea);
    input(textarea, "`", {
      isComposing: true,
      inputType: "insertCompositionText",
    });
    expect(runtimeRef.current!.thread.composer.getState().text).toBe("");

    input(textarea, "`a");

    expect(runtimeRef.current!.thread.composer.getState().text).toBe("`a");
    expect(textarea.value).toBe("`a");
  });

  it("continues to ignore active composition input", () => {
    const runtimeRef = renderInput();
    const textarea = screen.getByRole("textbox", {
      name: "Message",
    }) as HTMLTextAreaElement;

    fireEvent.compositionStart(textarea);
    input(textarea, "あ", {
      isComposing: true,
      inputType: "insertCompositionText",
    });

    expect(runtimeRef.current!.thread.composer.getState().text).toBe("");
  });
});
