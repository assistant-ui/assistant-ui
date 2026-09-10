// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import {
  forwardRef,
  useState,
  type ComponentProps,
  type ChangeEvent,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergeModelContexts } from "@assistant-ui/core";

const { registerMock, auiMock } = vi.hoisted(() => {
  const register = vi.fn((_provider: unknown) => () => {});
  return {
    registerMock: register,
    auiMock: {
      modelContext: { register },
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => auiMock,
}));

import { makeAssistantVisible } from "./makeAssistantVisible";

type EditTool = {
  execute: (args: { editId: string; value: string }) => Promise<unknown>;
};

type ClickTool = {
  execute: (args: { clickId: string }) => Promise<unknown>;
};

type ModelContextProvider = {
  getModelContext: () => {
    tools: {
      edit?: EditTool;
      click?: ClickTool;
    };
  };
};

const ControlledInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ onChange, ...props }, ref) => {
    const [value, setValue] = useState("initial");
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      onChange?.(event);
    };

    return (
      <input
        {...props}
        ref={ref}
        value={value}
        data-react-value={value}
        onChange={handleChange}
      />
    );
  },
);

const ControlledTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(({ onChange, ...props }, ref) => {
  const [value, setValue] = useState("initial");
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    onChange?.(event);
  };

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      data-react-value={value}
      onChange={handleChange}
    />
  );
});

const Button = forwardRef<HTMLButtonElement, ComponentProps<"button">>(
  (props, ref) => <button {...props} ref={ref} />,
);

const SplitRefButton = forwardRef<HTMLButtonElement, ComponentProps<"div">>(
  ({ children, ...props }, ref) => (
    <div {...props}>
      <button ref={ref}>{children}</button>
    </div>
  ),
);

const getRegisteredTools = () => {
  const provider = registerMock.mock.calls[0]![0] as ModelContextProvider;
  return provider.getModelContext().tools;
};

const runEditTool = async (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const editId = element.dataset.editId;
  if (editId === undefined) throw new Error("Missing edit id");

  const edit = getRegisteredTools().edit;
  if (!edit) throw new Error("Missing edit tool");
  const task = edit.execute({
    editId,
    value,
  });
  await vi.runAllTimersAsync();
  await task;
};

describe("makeAssistantVisible", () => {
  beforeEach(() => {
    registerMock.mockClear();
    vi.stubGlobal("CSS", { escape: (value: string) => value });
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("updates controlled input state through the edit tool", async () => {
    const EditableInput = makeAssistantVisible(ControlledInput, {
      editable: true,
    });
    const onChange = vi.fn();
    const input = render(<EditableInput onChange={onChange} />).getByRole(
      "textbox",
    );

    await act(async () => {
      await runEditTool(input as HTMLInputElement, "updated");
    });

    expect(input).toHaveProperty("value", "updated");
    expect(input.getAttribute("data-react-value")).toBe("updated");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("updates controlled textarea state through the edit tool", async () => {
    const EditableTextarea = makeAssistantVisible(ControlledTextarea, {
      editable: true,
    });
    const onChange = vi.fn();
    const textarea = render(<EditableTextarea onChange={onChange} />).getByRole(
      "textbox",
    );

    await act(async () => {
      await runEditTool(textarea as HTMLTextAreaElement, "updated");
    });

    expect(textarea).toHaveProperty("value", "updated");
    expect(textarea.getAttribute("data-react-value")).toBe("updated");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("preserves the default action settle delay", async () => {
    const EditableInput = makeAssistantVisible(ControlledInput, {
      editable: true,
    });
    const input = render(<EditableInput />).getByRole("textbox");
    const editId = (input as HTMLInputElement).dataset.editId!;
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    expect(
      (input as HTMLInputElement).dataset.actionSettleDelay,
    ).toBeUndefined();

    const task = getRegisteredTools().edit!.execute({
      editId,
      value: "updated",
    });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    await vi.runAllTimersAsync();
    await task;
    setTimeoutSpy.mockRestore();
  });

  it("uses the default when the rendered settle delay is invalid", async () => {
    const ClickableButton = makeAssistantVisible(Button, {
      clickable: true,
      settleDelayMs: 25,
    });
    const button = render(<ClickableButton>Run</ClickableButton>).getByRole(
      "button",
    );
    const clickId = (button as HTMLButtonElement).dataset.clickId!;
    (button as HTMLButtonElement).dataset.actionSettleDelay = "invalid";
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const task = getRegisteredTools().click!.execute({ clickId });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    await vi.runAllTimersAsync();
    await task;
    setTimeoutSpy.mockRestore();
  });

  it("uses the configured settle delay for click actions", async () => {
    const ClickableButton = makeAssistantVisible(Button, {
      clickable: true,
      settleDelayMs: 25,
    });
    const onClick = vi.fn();
    const button = render(
      <ClickableButton onClick={onClick}>Run</ClickableButton>,
    ).getByRole("button");
    const clickId = (button as HTMLButtonElement).dataset.clickId!;
    const settled = vi.fn();

    const task = getRegisteredTools().click!.execute({ clickId });
    void task.then(settled);

    expect(onClick).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(24);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await task;
    expect(settled).toHaveBeenCalledOnce();
  });

  it("uses the action id when the forwarded ref targets a child", async () => {
    const ClickableButton = makeAssistantVisible(SplitRefButton, {
      clickable: true,
      settleDelayMs: 25,
    });
    const onClick = vi.fn();
    const view = render(
      <ClickableButton data-testid="action" onClick={onClick}>
        Run
      </ClickableButton>,
    );
    const action = view.getByTestId("action");
    const clickId = action.dataset.clickId!;
    const settled = vi.fn();

    const task = getRegisteredTools().click!.execute({ clickId });
    void task.then(settled);

    expect(onClick).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(24);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await task;
    expect(settled).toHaveBeenCalledOnce();
  });

  it("shares tools across wrappers while keeping per-element delays", async () => {
    const SlowButton = makeAssistantVisible(Button, {
      clickable: true,
      editable: true,
      settleDelayMs: 25,
    });
    const ImmediateButton = makeAssistantVisible(Button, {
      clickable: true,
      editable: true,
      settleDelayMs: 0,
    });
    const view = render(
      <>
        <SlowButton>Slow</SlowButton>
        <ImmediateButton>Immediate</ImmediateButton>
      </>,
    );
    const providers = registerMock.mock.calls.map(
      ([provider]) => provider as ModelContextProvider,
    );
    const mergedContext = mergeModelContexts(new Set(providers));

    expect(mergedContext.tools?.click).toBe(
      providers[0]!.getModelContext().tools.click,
    );
    expect(mergedContext.tools?.click).toBe(
      providers[1]!.getModelContext().tools.click,
    );
    expect(mergedContext.tools?.edit).toBe(
      providers[0]!.getModelContext().tools.edit,
    );
    expect(mergedContext.tools?.edit).toBe(
      providers[1]!.getModelContext().tools.edit,
    );

    const [slowButton, immediateButton] = view.getAllByRole("button");
    const click = mergedContext.tools!.click!;
    const slowTask = click.execute({
      clickId: (slowButton as HTMLButtonElement).dataset.clickId!,
    });
    const immediateTask = click.execute({
      clickId: (immediateButton as HTMLButtonElement).dataset.clickId!,
    });

    await immediateTask;
    let slowSettled = false;
    void slowTask.then(() => {
      slowSettled = true;
    });
    await vi.advanceTimersByTimeAsync(24);
    expect(slowSettled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await slowTask;
  });

  it("shares the edit tool across wrappers while keeping per-element delays", async () => {
    const SlowInput = makeAssistantVisible(ControlledInput, {
      editable: true,
      settleDelayMs: 25,
    });
    const ImmediateInput = makeAssistantVisible(ControlledInput, {
      editable: true,
      settleDelayMs: 0,
    });
    const view = render(
      <>
        <SlowInput aria-label="Slow" />
        <ImmediateInput aria-label="Immediate" />
      </>,
    );
    const providers = registerMock.mock.calls.map(
      ([provider]) => provider as ModelContextProvider,
    );
    const mergedContext = mergeModelContexts(new Set(providers));

    expect(mergedContext.tools?.edit).toBe(
      providers[0]!.getModelContext().tools.edit,
    );
    expect(mergedContext.tools?.edit).toBe(
      providers[1]!.getModelContext().tools.edit,
    );

    const slowInput = view.getByRole("textbox", { name: "Slow" });
    const immediateInput = view.getByRole("textbox", { name: "Immediate" });
    const edit = mergedContext.tools!.edit!;
    const slowTask = edit.execute({
      editId: (slowInput as HTMLInputElement).dataset.editId!,
      value: "slow update",
    });
    const immediateTask = edit.execute({
      editId: (immediateInput as HTMLInputElement).dataset.editId!,
      value: "immediate update",
    });

    await immediateTask;
    expect(immediateInput).toHaveProperty("value", "immediate update");
    let slowSettled = false;
    void slowTask.then(() => {
      slowSettled = true;
    });
    await vi.advanceTimersByTimeAsync(24);
    expect(slowSettled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await slowTask;
    expect(slowInput).toHaveProperty("value", "slow update");
  });

  it("allows the action settle delay to be disabled", async () => {
    const EditableInput = makeAssistantVisible(ControlledInput, {
      editable: true,
      settleDelayMs: 0,
    });
    const input = render(<EditableInput />).getByRole("textbox");
    const editId = (input as HTMLInputElement).dataset.editId!;
    const timersBefore = vi.getTimerCount();

    const task = getRegisteredTools().edit!.execute({
      editId,
      value: "updated",
    });

    expect(vi.getTimerCount()).toBe(timersBefore);
    await task;
    expect(input).toHaveProperty("value", "updated");
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    "rejects an invalid action settle delay of %s",
    (settleDelayMs) => {
      expect(() =>
        makeAssistantVisible(Button, { clickable: true, settleDelayMs }),
      ).toThrow(
        new RangeError("settleDelayMs must be between 0 and 2147483647"),
      );
    },
  );
});
