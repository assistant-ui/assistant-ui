import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const mockUseFocus = vi.fn();

type InputHandler = (
  input: string,
  key: {
    return?: boolean;
  },
) => void;

let inputHandler: InputHandler | undefined;
let inputOptions: { isActive?: boolean } | undefined;

const sendInput = (input: string, key: Parameters<InputHandler>[1]) => {
  if (!inputHandler) {
    throw new Error("Pressable test input handler was not registered");
  }
  if (inputOptions?.isActive) {
    inputHandler(input, key);
  }
};

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: (options: { isActive?: boolean }) => mockUseFocus(options),
    useInput: (handler: InputHandler, options?: { isActive?: boolean }) => {
      inputHandler = handler;
      inputOptions = options;
    },
  };
});

import { Pressable } from "../primitives/internal/Pressable";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  inputHandler = undefined;
  inputOptions = undefined;
});

describe("Pressable", () => {
  it("activates on enter when focused", () => {
    const onPress = vi.fn();
    mockUseFocus.mockReturnValue({ isFocused: true });

    render(
      <Pressable onPress={onPress}>
        <Text>Submit</Text>
      </Pressable>,
    );

    expect(inputOptions).toEqual({ isActive: true });
    sendInput("", { return: true });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("activates on space when focused", () => {
    const onPress = vi.fn();
    mockUseFocus.mockReturnValue({ isFocused: true });

    render(
      <Pressable onPress={onPress}>
        <Text>Submit</Text>
      </Pressable>,
    );

    expect(inputOptions).toEqual({ isActive: true });
    sendInput(" ", {});

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not activate when disabled", () => {
    const onPress = vi.fn();
    mockUseFocus.mockReturnValue({ isFocused: false });

    render(
      <Pressable disabled onPress={onPress}>
        <Text>Submit</Text>
      </Pressable>,
    );

    expect(mockUseFocus).toHaveBeenCalledWith({ isActive: false });
    expect(inputOptions).toEqual({ isActive: false });
    sendInput("", { return: true });
    sendInput(" ", {});

    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not activate when unfocused", () => {
    const onPress = vi.fn();
    mockUseFocus.mockReturnValue({ isFocused: false });

    render(
      <Pressable onPress={onPress}>
        <Text>Submit</Text>
      </Pressable>,
    );

    expect(inputOptions).toEqual({ isActive: false });
    sendInput("", { return: true });
    sendInput(" ", {});

    expect(onPress).not.toHaveBeenCalled();
  });

  it("passes disabled state to render-prop children", () => {
    mockUseFocus.mockReturnValue({ isFocused: false });

    const result = render(
      <Pressable disabled>
        {({ isFocused, disabled }) => (
          <Text>{`${isFocused ? "focused" : "blurred"} ${disabled ? "disabled" : "enabled"}`}</Text>
        )}
      </Pressable>,
    );

    expect(result.lastFrame()).toContain("blurred disabled");
  });

  it("passes focused state to render-prop children when enabled", () => {
    mockUseFocus.mockReturnValue({ isFocused: true });

    const result = render(
      <Pressable>
        {({ isFocused, disabled }) => (
          <Text>{`${isFocused ? "focused" : "blurred"} ${disabled ? "disabled" : "enabled"}`}</Text>
        )}
      </Pressable>,
    );

    expect(result.lastFrame()).toContain("focused enabled");
  });
});
