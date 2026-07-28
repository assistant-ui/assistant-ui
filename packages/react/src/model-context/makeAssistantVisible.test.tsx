// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import {
  forwardRef,
  useState,
  type ComponentProps,
  type ChangeEvent,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

type ModelContextProvider = {
  getModelContext: () => {
    tools: {
      edit: EditTool;
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

const runEditTool = async (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const editId = element.dataset.editId;
  if (editId === undefined) throw new Error("Missing edit id");

  const provider = registerMock.mock.calls[0]![0] as ModelContextProvider;
  const task = provider.getModelContext().tools.edit.execute({
    editId,
    value,
  });
  await vi.runAllTimersAsync();
  await task;
};

describe("makeAssistantVisible editable components", () => {
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
});
