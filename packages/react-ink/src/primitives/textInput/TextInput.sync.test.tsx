import { createRef, useImperativeHandle, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { TextInput } from "./TextInput";

type InputHandler = (
  text: string,
  key: { return?: boolean; backspace?: boolean; leftArrow?: boolean },
) => void;

const input = vi.hoisted(() => ({
  handle: undefined as InputHandler | undefined,
}));

vi.mock("ink", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ink")>()),
  useFocus: () => ({ isFocused: true }),
  useInput: (handler: InputHandler) => {
    input.handle = handler;
  },
}));

const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
  cleanup();
  input.handle = undefined;
});

describe("TextInput controlled updates", () => {
  it.each([
    {
      name: "replacement",
      initial: "",
      edits: ["a", "b"],
      accepted: "ab",
      replacement: "a",
    },
    {
      name: "clear",
      initial: "a",
      edits: [null, "b"],
      accepted: "b",
      replacement: "",
    },
    {
      name: "edit returning to the original value",
      initial: "",
      edits: ["a", null],
      accepted: "",
      replacement: "a",
    },
    {
      name: "repeated intermediate value",
      initial: "",
      edits: ["a", null, "a", "b"],
      accepted: "ab",
      replacement: "a",
    },
  ])(
    "synchronizes controlled text after batched typing: $name",
    async ({ initial, edits, accepted, replacement }) => {
      const control = createRef<{ setValue: (text: string) => void }>();
      const onChange = vi.fn();
      const onSubmit = vi.fn();
      const App = () => {
        const [value, setValue] = useState(initial);
        useImperativeHandle(control, () => ({ setValue }), []);
        return (
          <TextInput
            value={value}
            onChange={(text) => {
              onChange(text);
              setValue(text);
            }}
            onSubmit={onSubmit}
            submitOnEnter
          />
        );
      };
      const { lastFrame } = render(<App />);
      await settle();

      for (const edit of edits) {
        input.handle!(edit ?? "", edit === null ? { backspace: true } : {});
      }
      await settle();
      await vi.waitFor(() => expect(lastFrame()?.trim()).toBe(accepted));
      const editCount = onChange.mock.calls.length;

      control.current!.setValue(replacement);
      await vi.waitFor(() => expect(lastFrame()?.trim()).toBe(replacement));
      expect(onChange).toHaveBeenCalledTimes(editCount);
      input.handle!("", { return: true });
      expect(onSubmit).toHaveBeenLastCalledWith(replacement);

      input.handle!("z", {});
      expect(onChange).toHaveBeenLastCalledWith(`${replacement}z`);
    },
  );

  it("applies an owner correction matching an intermediate batched edit", async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const App = () => {
      const [value, setValue] = useState("hello");
      return (
        <TextInput
          value={value}
          onChange={(text) => {
            onChange(text);
            setValue(text.replaceAll("b", ""));
          }}
          onSubmit={onSubmit}
          submitOnEnter
        />
      );
    };
    const { lastFrame } = render(<App />);
    await settle();
    input.handle!("", { leftArrow: true });
    input.handle!("", { leftArrow: true });
    input.handle!("a", {});
    input.handle!("b", {});
    await vi.waitFor(() => expect(lastFrame()?.trim()).toBe("helalo"));

    input.handle!("", { return: true });
    expect(onSubmit).toHaveBeenLastCalledWith("helalo");
    input.handle!("z", {});
    expect(onChange).toHaveBeenLastCalledWith("helalzo");
  });
});
