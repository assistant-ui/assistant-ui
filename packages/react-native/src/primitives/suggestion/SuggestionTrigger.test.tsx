import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuggestionTrigger } from "./SuggestionTrigger";

const h = vi.hoisted(() => ({
  trigger: vi.fn<() => void>(),
  useSuggestionTrigger: vi.fn<
    (arg: {
      prompt: string | undefined;
      send?: boolean;
      clearComposer?: boolean;
    }) => {
      trigger: () => void;
      disabled: boolean;
    }
  >(),
  suggestion: { prompt: "" as string | undefined },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { suggestion: typeof h.suggestion }) => T) =>
    selector({ suggestion: h.suggestion }),
}));

vi.mock("@assistant-ui/core/react", () => ({
  useSuggestionTrigger: (arg: Parameters<typeof h.useSuggestionTrigger>[0]) =>
    h.useSuggestionTrigger(arg),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("SuggestionTrigger", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.trigger.mockReset();
    h.suggestion.prompt = "Tell me a joke";
    h.useSuggestionTrigger.mockReset();
    h.useSuggestionTrigger.mockReturnValue({
      trigger: h.trigger,
      disabled: false,
    });

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

  const mount = async (
    props: Partial<Parameters<typeof SuggestionTrigger>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <SuggestionTrigger testID="t" {...props}>
          {props.children ?? "Press me"}
        </SuggestionTrigger>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  const press = async (el: HTMLElement) => {
    await act(async () => {
      el.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
  };

  it("passes the store prompt and trigger options to useSuggestionTrigger", async () => {
    h.suggestion.prompt = "Write a poem";
    await mount({ send: true, clearComposer: false });

    expect(h.useSuggestionTrigger).toHaveBeenCalledWith({
      prompt: "Write a poem",
      send: true,
      clearComposer: false,
    });
  });

  it("defaults clearComposer to true and leaves send undefined", async () => {
    await mount();

    expect(h.useSuggestionTrigger).toHaveBeenCalledWith({
      prompt: "Tell me a joke",
      send: undefined,
      clearComposer: true,
    });
  });

  it("fires the trigger when pressed", async () => {
    const el = await mount();
    await press(el);

    expect(h.trigger).toHaveBeenCalledTimes(1);
  });

  it("renders its children", async () => {
    const el = await mount({ children: "Suggested action" });
    expect(el.textContent).toBe("Suggested action");
  });

  it("does not fire the trigger when the hook reports disabled", async () => {
    h.useSuggestionTrigger.mockReturnValue({
      trigger: h.trigger,
      disabled: true,
    });
    const el = await mount();
    await press(el);

    expect(h.trigger).not.toHaveBeenCalled();
  });

  it("lets an explicit disabled prop override the hook's enabled state", async () => {
    h.useSuggestionTrigger.mockReturnValue({
      trigger: h.trigger,
      disabled: false,
    });
    const el = await mount({ disabled: true });
    await press(el);

    expect(h.trigger).not.toHaveBeenCalled();
  });

  it("stays pressable when the prop disabled is false but the hook is disabled", async () => {
    h.useSuggestionTrigger.mockReturnValue({
      trigger: h.trigger,
      disabled: true,
    });
    const el = await mount({ disabled: false });
    await press(el);

    expect(h.trigger).toHaveBeenCalledTimes(1);
  });
});
