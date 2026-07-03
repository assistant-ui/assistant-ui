import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerInput } from "./ComposerInput";

const h = vi.hoisted(() => ({
  setText: vi.fn<(text: string) => void>(),
  sendSpy: vi.fn<() => void>(),
  flushTapSyncSpy: vi.fn(<T,>(fn: () => T) => fn()),
  composerState: { text: "" },
  platform: { os: "web" as "web" | "ios" | "android" },
}));

vi.mock("@assistant-ui/store", () => {
  const aui = {
    composer: () => ({
      setText: h.setText,
      send: h.sendSpy,
    }),
  };
  return {
    useAui: () => aui,
    useAuiState: <T,>(
      selector: (s: { composer: typeof h.composerState }) => T,
    ) => selector({ composer: h.composerState }),
  };
});

vi.mock("@assistant-ui/tap", () => ({
  flushTapSync: h.flushTapSyncSpy,
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown> & {
    Platform: Record<string, unknown>;
  };
  return {
    ...actual,
    Platform: {
      ...actual.Platform,
      get OS() {
        return h.platform.os;
      },
      select: (obj: Record<string, unknown>) =>
        h.platform.os in obj ? obj[h.platform.os] : obj.default,
    },
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const setNativeValue = (
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(input, value);
};

const fireInput = (
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  setNativeValue(input, value);
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
};

const fireKeyDown = (
  input: HTMLInputElement | HTMLTextAreaElement,
  opts: {
    key?: string;
    shiftKey?: boolean;
    isComposing?: boolean;
    keyCode?: number;
  } = {},
): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: opts.key ?? "Enter",
    shiftKey: opts.shiftKey ?? false,
    isComposing: opts.isComposing ?? false,
  });
  if (opts.keyCode !== undefined) {
    Object.defineProperty(event, "keyCode", { value: opts.keyCode });
  }
  input.dispatchEvent(event);
  return event;
};

describe("ComposerInput", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.setText.mockReset();
    h.sendSpy.mockReset();
    h.flushTapSyncSpy.mockClear();
    h.composerState.text = "";
    h.platform.os = "web";

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
    props: Partial<Parameters<typeof ComposerInput>[0]> = {},
  ) => {
    await act(async () => {
      root.render(<ComposerInput {...props} />);
    });
    const input = container.querySelector("textarea, input") as
      | HTMLInputElement
      | HTMLTextAreaElement;
    expect(input).not.toBeNull();
    return input;
  };

  it("renders an input controlled by the composer text", async () => {
    h.composerState.text = "hello";
    const input = await mount();
    expect(input.value).toBe("hello");
  });

  describe("web", () => {
    it("routes typing through setText wrapped in flushTapSync", async () => {
      const input = await mount();

      await act(async () => {
        fireInput(input, "ni");
      });

      expect(h.setText).toHaveBeenCalledWith("ni");
      expect(h.flushTapSyncSpy).toHaveBeenCalledTimes(1);
    });

    it("submits on plain Enter under the default submitMode", async () => {
      const input = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(input, { key: "Enter" });
      });

      expect(h.sendSpy).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("inserts a newline on Shift+Enter without submitting", async () => {
      const input = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(input, { key: "Enter", shiftKey: true });
      });

      expect(h.sendSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("ignores Enter while isComposing is set", async () => {
      const input = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(input, { key: "Enter", isComposing: true });
      });

      expect(h.sendSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("ignores Enter while keyCode is the IME sentinel 229", async () => {
      const input = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(input, { key: "Enter", keyCode: 229 });
      });

      expect(h.sendSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("does not submit on a non-Enter key", async () => {
      const input = await mount();

      await act(async () => {
        fireKeyDown(input, { key: "a" });
      });

      expect(h.sendSpy).not.toHaveBeenCalled();
    });

    it("does not submit when submitMode is none", async () => {
      const input = await mount({ submitMode: "none" });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(input, { key: "Enter" });
      });

      expect(h.sendSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("shows a scrollbar when multiline content exceeds the maximum height", async () => {
      h.composerState.text = "line 1";
      const input = await mount({
        multiline: true,
        style: { maxHeight: 40 },
      });
      expect(input.tagName).toBe("TEXTAREA");

      Object.defineProperty(input, "scrollHeight", {
        configurable: true,
        value: 120,
      });

      h.composerState.text = "line 1\nline 2\nline 3";
      await act(async () => {
        root.render(<ComposerInput multiline style={{ maxHeight: 40 }} />);
      });

      expect(input.style.height).toBe("40px");
      expect(input.style.overflowY).toBe("auto");
      expect(input.style.overflowX).toBe("hidden");
    });

    it("forwards keydown events to a consumer onKeyPress handler", async () => {
      const onKeyPress = vi.fn();
      const input = await mount({ onKeyPress });

      await act(async () => {
        fireKeyDown(input, { key: "Enter" });
        fireKeyDown(input, { key: "a" });
      });

      expect(onKeyPress).toHaveBeenCalledTimes(2);
    });
  });

  describe("native", () => {
    beforeEach(() => {
      h.platform.os = "ios";
    });

    it("routes typing through setText without flushTapSync", async () => {
      const input = await mount();

      await act(async () => {
        fireInput(input, "ni");
      });

      expect(h.setText).toHaveBeenCalledWith("ni");
      expect(h.flushTapSyncSpy).not.toHaveBeenCalled();
    });

    it("never submits on Enter and leaves the event untouched", async () => {
      const onKeyPress = vi.fn();
      const input = await mount({ onKeyPress });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(input, { key: "Enter" });
      });

      expect(h.sendSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
      expect(onKeyPress).toHaveBeenCalledTimes(1);
    });
  });
});
