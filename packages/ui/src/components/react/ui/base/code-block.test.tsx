import { render, screen, act } from "@testing-library/react";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock as CodeBlockBase } from "./code-block";
import { CodeBlock as CodeBlockRadix } from "../radix/code-block";

const flavors = [
  ["base", CodeBlockBase],
  ["radix", CodeBlockRadix],
] as const;

const clickCopy = async () => {
  await act(async () => {
    screen.getByLabelText("Copy code").click();
    await Promise.resolve();
  });
};

const isCopied = () => {
  const svg = screen.getByLabelText("Copy code").querySelector("svg");
  return (svg?.getAttribute("class") ?? "").includes("check");
};

const stubClipboard = (writeText: () => Promise<void>) => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
};

beforeEach(() => {
  vi.useFakeTimers();
  stubClipboard(() => Promise.resolve());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each(flavors)(
  "CodeBlock copy confirmation (%s)",
  (_flavor, CodeBlock) => {
    it("restarts the confirmation window when copied again inside it", async () => {
      render(<CodeBlock copyText="hello" />);

      await clickCopy();
      expect(isCopied()).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(1200);
      });
      await clickCopy();
      expect(isCopied()).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });
      expect(isCopied()).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(isCopied()).toBe(false);
    });

    it("cancels its pending reset timer on unmount", async () => {
      const view = render(<CodeBlock copyText="hello" />);

      await clickCopy();
      expect(vi.getTimerCount()).toBe(1);

      view.unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    it("reports a write that settles after unmount without arming a timer", async () => {
      let settle!: () => void;
      stubClipboard(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve;
          }),
      );
      const onCopied = vi.fn();
      const view = render(<CodeBlock copyText="hello" onCopied={onCopied} />);

      await act(async () => {
        screen.getByLabelText("Copy code").click();
      });
      view.unmount();

      await act(async () => {
        settle();
        await Promise.resolve();
      });

      expect(onCopied).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("returns to idle when hidden and shown by Activity", async () => {
      const view = render(
        <Activity mode="visible">
          <CodeBlock copyText="hello" />
        </Activity>,
      );

      await clickCopy();
      expect(isCopied()).toBe(true);

      await act(async () => {
        view.rerender(
          <Activity mode="hidden">
            <CodeBlock copyText="hello" />
          </Activity>,
        );
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await act(async () => {
        view.rerender(
          <Activity mode="visible">
            <CodeBlock copyText="hello" />
          </Activity>,
        );
      });

      expect(isCopied()).toBe(false);
    });

    it("reports a write that settles while hidden and comes back idle", async () => {
      let settle!: () => void;
      stubClipboard(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve;
          }),
      );
      const onCopied = vi.fn();
      const tree = (mode: "visible" | "hidden") => (
        <Activity mode={mode}>
          <CodeBlock copyText="hello" onCopied={onCopied} />
        </Activity>
      );
      const view = render(tree("visible"));

      await act(async () => {
        screen.getByLabelText("Copy code").click();
      });
      await act(async () => {
        view.rerender(tree("hidden"));
      });
      await act(async () => {
        settle();
        await Promise.resolve();
      });
      await act(async () => {
        view.rerender(tree("visible"));
      });

      expect(onCopied).toHaveBeenCalledOnce();
      expect(isCopied()).toBe(false);
    });
  },
);

describe.each(flavors)("CodeBlock collapse (%s)", (_flavor, CodeBlock) => {
  const code = "const first = 1;\nconst second = 2;\nconst third = 3;";
  const CodeLines = ({ code }: { code: string }) => (
    <pre>
      <code>
        {code.split("\n").map((line, index, lines) => (
          <span className="line" key={line}>
            {line}
            {index < lines.length - 1 && "\n"}
          </span>
        ))}
      </code>
    </pre>
  );

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 0, 20),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only offers collapse when the code exceeds the limit", () => {
    const { rerender } = render(
      <CodeBlock maxCollapsedLines={2}>
        <CodeLines code={"const first = 1;\nconst second = 2;"} />
      </CodeBlock>,
    );

    expect(
      screen.queryByRole("button", { name: /Show all .* lines/ }),
    ).toBeNull();
    expect(screen.getByRole("region", { name: "Code" }).style.maxHeight).toBe(
      "",
    );

    rerender(
      <CodeBlock maxCollapsedLines={2}>
        <CodeLines code={code} />
      </CodeBlock>,
    );

    expect(
      screen.getByRole("button", { name: "Show all 3 lines" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Code" }).style.maxHeight).toBe(
      "40px",
    );
  });

  it("ignores a trailing newline when counting unhighlighted code", () => {
    render(
      <CodeBlock maxCollapsedLines={2}>
        <pre>
          <code>{"const first = 1;\nconst second = 2;\n"}</code>
        </pre>
      </CodeBlock>,
    );

    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("remeasures when a highlighter adds rendered lines", async () => {
    const { container } = render(
      <CodeBlock maxCollapsedLines={2}>
        <pre>
          <code>loading</code>
        </pre>
      </CodeBlock>,
    );
    const code = container.querySelector("code")!;

    await act(async () => {
      code.innerHTML =
        '<span class="line">const first = 1;</span><span class="line">const second = 2;</span><span class="line">const third = 3;</span>';
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", { name: "Show all 3 lines" }),
    ).toBeTruthy();
  });

  it("remeasures when a highlighter replaces the pre element", async () => {
    const { container } = render(
      <CodeBlock maxCollapsedLines={2}>
        <pre>
          <code>loading</code>
        </pre>
      </CodeBlock>,
    );
    const pre = container.querySelector("pre")!;
    const replacement = document.createElement("pre");
    replacement.innerHTML =
      '<code><span class="line">const first = 1;</span><span class="line">const second = 2;</span><span class="line">const third = 3;</span></code>';

    await act(async () => {
      pre.replaceWith(replacement);
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", { name: "Show all 3 lines" }),
    ).toBeTruthy();
  });

  it("expands and collapses with an accessible toggle", () => {
    render(
      <CodeBlock maxCollapsedLines={2}>
        <CodeLines code={code} />
      </CodeBlock>,
    );

    const toggle = screen.getByRole("button", { name: "Show all 3 lines" });
    const viewport = screen.getByRole("region", { name: "Code" });

    expect(toggle.getAttribute("aria-controls")).toBe(viewport.id);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      toggle.click();
    });

    expect(screen.getByRole("button", { name: "Show less" })).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      toggle.click();
    });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.getByRole("button", { name: "Show all 3 lines" }),
    ).toBeTruthy();
  });

  it("copies the full code while collapsed", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);

    render(
      <CodeBlock maxCollapsedLines={2}>
        <CodeLines code={code} />
      </CodeBlock>,
    );

    await clickCopy();

    expect(writeText).toHaveBeenCalledWith(code);
  });

  it("keeps the collapse fade outside the scrolling region", () => {
    const { container } = render(
      <CodeBlock maxCollapsedLines={2}>
        <CodeLines code={code} />
      </CodeBlock>,
    );

    const region = screen.getByRole("region", { name: "Code" });
    const fade = container.querySelector('[aria-hidden="true"]');

    expect(fade).toBeTruthy();
    expect(region.contains(fade)).toBe(false);
  });
});
