import {
  act,
  createRef,
  startTransition,
  useImperativeHandle,
  useState,
  useSyncExternalStore,
} from "react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { TextInput } from "./TextInput";

type InputHandler = (
  text: string,
  key: { return?: boolean; backspace?: boolean; leftArrow?: boolean },
) => void;

const input = vi.hoisted(() => ({
  handle: undefined as InputHandler | undefined,
  concurrent: false,
  commits: [] as Array<{ value: string; text: string; cursorOffset: number }>,
}));

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    render: (
      node: Parameters<typeof actual.render>[0],
      options: Parameters<typeof actual.render>[1],
    ) => actual.render(node, { ...options, concurrent: input.concurrent }),
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler) => {
      input.handle = handler;
    },
  };
});

vi.mock("./useTextBuffer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useTextBuffer")>();
  const { useEffect } = await import("react");
  return {
    ...actual,
    useTextBuffer: (value: string) => {
      const buffer = actual.useTextBuffer(value);
      useEffect(() => {
        input.commits.push({
          value,
          text: buffer.text,
          cursorOffset: buffer.cursorOffset,
        });
      });
      return buffer;
    },
  };
});

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

afterEach(() => {
  cleanup();
  input.handle = undefined;
  input.concurrent = false;
  input.commits = [];
});

afterAll(() => vi.unstubAllGlobals());

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
      let lastFrame: ReturnType<typeof render>["lastFrame"] | undefined;
      await act(async () => {
        lastFrame = render(<App />).lastFrame;
      });
      await vi.waitFor(() => expect(input.handle).toBeDefined());

      await act(async () => {
        for (const edit of edits) {
          input.handle!(edit ?? "", edit === null ? { backspace: true } : {});
        }
      });
      await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe(accepted));
      const editCount = onChange.mock.calls.length;

      await act(async () => control.current!.setValue(replacement));
      await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe(replacement));
      expect(onChange).toHaveBeenCalledTimes(editCount);
      await act(async () => input.handle!("", { return: true }));
      expect(onSubmit).toHaveBeenLastCalledWith(replacement);

      await act(async () => input.handle!("z", {}));
      await vi.waitFor(() =>
        expect(lastFrame?.()?.trim()).toBe(`${replacement}z`),
      );
      expect(onChange).toHaveBeenLastCalledWith(`${replacement}z`);
    },
  );

  it("applies an unmatched owner correction after batched edits", async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const App = () => {
      const [value, setValue] = useState("hello");
      return (
        <TextInput
          value={value}
          onChange={(text) => {
            onChange(text);
            setValue(text.replaceAll("b", "").replaceAll("a", "x"));
          }}
          onSubmit={onSubmit}
          submitOnEnter
        />
      );
    };
    let lastFrame: ReturnType<typeof render>["lastFrame"] | undefined;
    await act(async () => {
      lastFrame = render(<App />).lastFrame;
    });
    await vi.waitFor(() => expect(input.handle).toBeDefined());
    await act(async () => {
      input.handle!("", { leftArrow: true });
      input.handle!("", { leftArrow: true });
      input.handle!("a", {});
      input.handle!("b", {});
    });
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("helxlo"));

    await act(async () => input.handle!("", { return: true }));
    expect(onSubmit).toHaveBeenLastCalledWith("helxlo");
    await act(async () => input.handle!("z", {}));
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("helxlzo"));
    expect(onChange).toHaveBeenLastCalledWith("helxlzo");
  });

  it("keeps the edit cursor when an owner echo commits before the buffer edit", async () => {
    input.concurrent = true;
    let value = "zz";
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    const getSnapshot = () => value;
    const onChange = vi.fn((text: string) => {
      value = text;
      for (const listener of listeners) listener();
    });
    const App = () => (
      <TextInput
        value={useSyncExternalStore(subscribe, getSnapshot)}
        onChange={onChange}
      />
    );
    let lastFrame: ReturnType<typeof render>["lastFrame"] | undefined;
    await act(async () => {
      lastFrame = render(<App />).lastFrame;
    });
    await vi.waitFor(() => expect(input.handle).toBeDefined());

    await act(async () => input.handle!("", { leftArrow: true }));
    await vi.waitFor(() => expect(input.commits.at(-1)?.cursorOffset).toBe(1));
    await act(async () => startTransition(() => input.handle!("a", {})));
    await vi.waitFor(() =>
      expect(input.commits).toContainEqual({
        value: "zaz",
        text: "zz",
        cursorOffset: 1,
      }),
    );
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("zaz"));

    await act(async () => input.handle!("b", {}));
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("zabz"));
    expect(onChange).toHaveBeenLastCalledWith("zabz");
  });

  it("keeps a later edit when an intermediate owner echo arrives", async () => {
    const control = createRef<{ setValue: (text: string) => void }>();
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const App = () => {
      const [value, setValue] = useState("");
      useImperativeHandle(control, () => ({ setValue }), []);
      return (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          submitOnEnter
        />
      );
    };
    let lastFrame: ReturnType<typeof render>["lastFrame"] | undefined;
    await act(async () => {
      lastFrame = render(<App />).lastFrame;
    });
    await vi.waitFor(() => expect(input.handle).toBeDefined());

    await act(async () => {
      input.handle!("a", {});
      input.handle!("b", {});
      control.current!.setValue("a");
    });
    await vi.waitFor(() =>
      expect(input.commits).toContainEqual({
        value: "a",
        text: "ab",
        cursorOffset: 2,
      }),
    );
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("ab"));
    expect(onChange.mock.calls.map(([text]) => text)).toEqual(["a", "ab"]);

    await act(async () => input.handle!("", { return: true }));
    expect(onSubmit).toHaveBeenLastCalledWith("ab");

    await act(async () => control.current!.setValue("ab"));
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("ab"));
    await act(async () => input.handle!("z", {}));
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("ab"));
    expect(onChange).toHaveBeenLastCalledWith("abz");
  });

  it("applies an unmatched owner correction after an intermediate echo", async () => {
    const control = createRef<{ setValue: (text: string) => void }>();
    const onChange = vi.fn();
    const App = () => {
      const [value, setValue] = useState("");
      useImperativeHandle(control, () => ({ setValue }), []);
      return <TextInput value={value} onChange={onChange} />;
    };
    let lastFrame: ReturnType<typeof render>["lastFrame"] | undefined;
    await act(async () => {
      lastFrame = render(<App />).lastFrame;
    });
    await vi.waitFor(() => expect(input.handle).toBeDefined());

    await act(async () => {
      input.handle!("a", {});
      input.handle!("b", {});
      control.current!.setValue("a");
    });
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("ab"));
    await act(async () => control.current!.setValue("x"));
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("x"));
    await act(async () => input.handle!("z", {}));
    await vi.waitFor(() => expect(lastFrame?.()?.trim()).toBe("x"));
    expect(onChange).toHaveBeenLastCalledWith("xz");
  });
});
