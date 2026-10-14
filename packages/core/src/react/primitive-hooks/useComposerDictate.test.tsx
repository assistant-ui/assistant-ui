// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessage } from "../../types/message";
import type { DictationAdapter } from "../../adapters/speech";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../runtimes/useExternalStoreRuntime";
import { useComposerDictate } from "./useComposerDictate";

afterEach(cleanup);

const setup = (isDisabled = false, withAdapter = true) => {
  const session: DictationAdapter.Session = {
    status: { type: "running" },
    stop: async () => {},
    cancel: () => {},
    onSpeech: () => () => {},
    onSpeechStart: () => () => {},
    onSpeechEnd: () => () => {},
  };
  const listen = vi.fn(() => session);
  const Button = () => {
    const { disabled, startDictation } = useComposerDictate();
    return (
      <button disabled={disabled} onClick={startDictation}>
        dictate
      </button>
    );
  };
  const App = ({ disabled }: { disabled: boolean }) => {
    const runtime = useExternalStoreRuntime<ThreadMessage>({
      messages: [],
      isDisabled: disabled,
      onNew: async () => {},
      adapters: withAdapter ? { dictation: { listen } } : {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Button />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<App disabled={isDisabled} />);
  const button = view.getByRole("button") as HTMLButtonElement;
  const click = () => act(async () => button.click());
  return {
    button,
    click,
    listen,
    setDisabled: (disabled: boolean) =>
      view.rerender(<App disabled={disabled} />),
  };
};

describe("useComposerDictate", () => {
  it("does not start the microphone on a disabled thread", async () => {
    const { button, click, listen } = setup(true);
    await click();
    expect(listen).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
  });

  it("starts dictation on an enabled thread and prevents a second start", async () => {
    const { button, click, listen } = setup();
    expect(button.disabled).toBe(false);
    await click();
    expect(listen).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    await click();
    expect(listen).toHaveBeenCalledOnce();
  });

  it("blocks dictation after the thread becomes disabled", async () => {
    const { button, click, listen, setDisabled } = setup();
    setDisabled(true);
    await click();
    expect(listen).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
  });

  it("allows dictation again after the thread is re-enabled", async () => {
    const { button, click, listen, setDisabled } = setup(true);
    expect(button.disabled).toBe(true);
    setDisabled(false);
    expect(button.disabled).toBe(false);
    await click();
    expect(listen).toHaveBeenCalledOnce();
  });

  it("disables dictation without an adapter", async () => {
    const { button, click, listen } = setup(false, false);
    expect(button.disabled).toBe(true);
    await click();
    expect(listen).not.toHaveBeenCalled();
  });
});
