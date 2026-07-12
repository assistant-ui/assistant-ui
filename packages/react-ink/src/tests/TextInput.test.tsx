import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";

type InputHandler = (
  input: string,
  key: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    return?: boolean;
    backspace?: boolean;
    delete?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
    upArrow?: boolean;
    downArrow?: boolean;
    home?: boolean;
    end?: boolean;
  },
) => void;

let inputHandler: InputHandler | undefined;

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler) => {
      inputHandler = handler;
    },
  };
});

import {
  TextInput,
  type TextInputProps,
} from "../primitives/textInput/TextInput";

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const settle = async () => {
  await flush();
  await flush();
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  inputHandler = undefined;
});

const Controlled = ({
  initial = "",
  onChange,
  ...rest
}: { initial?: string; onChange?: (text: string) => void } & Omit<
  TextInputProps,
  "value" | "onChange"
>) => {
  const [value, setValue] = useState(initial);
  return (
    <TextInput
      value={value}
      onChange={(text) => {
        setValue(text);
        onChange?.(text);
      }}
      {...rest}
    />
  );
};

describe("TextInput", () => {
  it("fires onChange and reflects the typed character", async () => {
    const onChange = vi.fn();
    const { lastFrame } = render(<Controlled onChange={onChange} />);
    await flush();

    inputHandler?.("a", {});
    await flush();

    expect(onChange).toHaveBeenCalledWith("a");
    expect(lastFrame()).toContain("a");
  });

  it("submits the current text on enter when submitOnEnter is set", async () => {
    const onSubmit = vi.fn();
    render(<Controlled initial="hello" submitOnEnter onSubmit={onSubmit} />);
    await flush();

    inputHandler?.("", { return: true });

    expect(onSubmit).toHaveBeenCalledWith("hello");
  });

  it("inserts a newline on shift-enter in multi-line submit mode", async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <Controlled
        initial="hi"
        multiLine
        submitOnEnter
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );
    await flush();

    inputHandler?.("", { return: true, shift: true });
    await flush();

    expect(onChange).toHaveBeenCalledWith("hi\n");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("deletes backward and kills to the line start", async () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <Controlled initial="hello" onChange={onChange} />,
    );
    await flush();

    inputHandler?.("", { backspace: true });
    expect(onChange).toHaveBeenLastCalledWith("hell");
    unmount();

    inputHandler = undefined;
    const killOnChange = vi.fn();
    render(<Controlled initial="hello" onChange={killOnChange} />);
    await flush();

    inputHandler?.("u", { ctrl: true });
    expect(killOnChange).toHaveBeenLastCalledWith("");
  });

  it("reflects an external value change without echoing back through onChange", async () => {
    const onChange = vi.fn();
    const { rerender, lastFrame } = render(
      <TextInput value="hello" onChange={onChange} />,
    );
    await flush();
    expect(lastFrame()).toContain("hello");

    rerender(<TextInput value="world" onChange={onChange} />);
    await flush();

    expect(lastFrame()).toContain("world");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("strips newlines from pasted input in single-line mode", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await flush();

    inputHandler?.("foo\nbar\r\nbaz", {});
    await flush();

    expect(onChange).toHaveBeenLastCalledWith("foobarbaz");
  });

  it("keeps newlines from pasted input in multi-line mode", async () => {
    const onChange = vi.fn();
    render(<Controlled multiLine onChange={onChange} />);
    await flush();

    inputHandler?.("foo\nbar", {});
    await flush();

    expect(onChange).toHaveBeenLastCalledWith("foo\nbar");
  });

  it("shows the placeholder only while empty", async () => {
    const onChange = vi.fn();
    const { rerender, lastFrame } = render(
      <TextInput value="" onChange={onChange} placeholder="Type here" />,
    );
    await flush();
    expect(lastFrame()).toContain("Type here");

    rerender(
      <TextInput value="filled" onChange={onChange} placeholder="Type here" />,
    );
    await flush();

    expect(lastFrame()).toContain("filled");
    expect(lastFrame()).not.toContain("Type here");
  });

  it("preserves the cursor when a normalizing owner corrects an edit", async () => {
    const emitted: string[] = [];
    const Upper = () => {
      const [value, setValue] = useState("hello");
      return (
        <TextInput
          value={value}
          onChange={(text) => {
            emitted.push(text);
            setValue(text.toUpperCase());
          }}
        />
      );
    };
    render(<Upper />);
    await flush();

    inputHandler?.("", { leftArrow: true });
    inputHandler?.("", { leftArrow: true });
    inputHandler?.("a", {});
    await settle();
    inputHandler?.("b", {});
    await settle();

    expect(emitted).toEqual(["helalo", "HELAbLO"]);
  });

  it("preserves the cursor when the owner rejects an edit", async () => {
    const emitted: string[] = [];
    render(<TextInput value="hello" onChange={(text) => emitted.push(text)} />);
    await flush();

    inputHandler?.("", { leftArrow: true });
    inputHandler?.("", { leftArrow: true });
    inputHandler?.("x", {});
    await settle();
    inputHandler?.("y", {});
    await settle();

    expect(emitted).toEqual(["helxlo", "hellyo"]);
  });

  it("moves the cursor to the end on an external replacement while idle", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TextInput value="hello" onChange={onChange} />,
    );
    await flush();

    rerender(<TextInput value="world" onChange={onChange} />);
    await flush();
    inputHandler?.("z", {});

    expect(onChange).toHaveBeenLastCalledWith("worldz");
  });

  it("snaps a preserved cursor to a grapheme boundary", async () => {
    const emitted: string[] = [];
    const Emojify = () => {
      const [value, setValue] = useState("");
      return (
        <TextInput
          value={value}
          onChange={(text) => {
            emitted.push(text);
            setValue("👍👍");
          }}
        />
      );
    };
    render(<Emojify />);
    await flush();

    inputHandler?.("x", {});
    await settle();
    inputHandler?.("z", {});
    await settle();

    expect(emitted[0]).toBe("x");
    expect(emitted[1]).toBe("z👍👍");
  });

  it("falls back to cursor-at-end when a deferred correction lands after pending edits were reconciled", async () => {
    const emitted: string[] = [];
    const { rerender } = render(
      <TextInput value="hello" onChange={(text) => emitted.push(text)} />,
    );
    await flush();

    inputHandler?.("", { leftArrow: true });
    inputHandler?.("", { leftArrow: true });
    inputHandler?.("a", {});
    inputHandler?.("b", {});
    await settle();

    rerender(
      <TextInput value="HELABLO" onChange={(text) => emitted.push(text)} />,
    );
    await settle();
    inputHandler?.("z", {});
    await settle();

    expect(emitted).toEqual(["helalo", "helablo", "HELABLOz"]);
  });

  it("submits the optimistic buffer text while a correction is pending", async () => {
    const onSubmit = vi.fn();
    const Upper = () => {
      const [value, setValue] = useState("hello");
      return (
        <TextInput
          value={value}
          submitOnEnter
          onSubmit={onSubmit}
          onChange={(text) => setValue(text.toUpperCase())}
        />
      );
    };
    render(<Upper />);
    await flush();

    inputHandler?.("", { leftArrow: true });
    inputHandler?.("", { leftArrow: true });
    inputHandler?.("x", {});
    inputHandler?.("", { return: true });
    await settle();

    expect(onSubmit).toHaveBeenCalledWith("helxlo");
  });
});
