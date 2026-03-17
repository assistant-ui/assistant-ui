import { Text } from "ink";
import { render } from "ink-testing-library";
import { describe, expect, it, vi, afterEach } from "vitest";
import { useShikiHighlighter } from "../useShikiHighlighter";

const { createHighlighterMock } = vi.hoisted(() => ({
  createHighlighterMock: vi.fn(),
}));

vi.mock("shiki", () => ({
  createHighlighter: createHighlighterMock,
}));

const flushEffects = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const waitForFrame = async (
  lastFrame: () => string | undefined | null,
  expected: string,
) => {
  for (let i = 0; i < 20; i++) {
    const frame = lastFrame();
    if (frame?.includes(expected)) return;
    await flushEffects();
  }

  expect(lastFrame()).toContain(expected);
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
};

const createShiki = () => ({
  dispose: vi.fn(),
  codeToTokensBase: (code: string, { theme }: { theme: string }) => [
    [{ content: `${theme}:${code}`, color: "#112233" }],
  ],
});

const Probe = ({ theme, langs }: { theme: string; langs: string[] }) => {
  const highlighter = useShikiHighlighter({ theme, langs });
  return (
    <Text>{highlighter?.("const x = 1;", "javascript") ?? "loading"}</Text>
  );
};

describe("useShikiHighlighter", () => {
  afterEach(() => {
    createHighlighterMock.mockReset();
  });

  it("clears the current highlighter while re-initializing", async () => {
    const first = deferred<ReturnType<typeof createShiki>>();
    const second = deferred<ReturnType<typeof createShiki>>();

    createHighlighterMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { lastFrame, rerender } = render(
      <Probe theme="github-dark" langs={["javascript"]} />,
    );

    expect(lastFrame()).toContain("loading");

    first.resolve(createShiki());
    await waitForFrame(lastFrame, "github-dark:const x = 1;");

    rerender(<Probe theme="nord" langs={["javascript"]} />);
    await waitForFrame(lastFrame, "loading");

    second.resolve(createShiki());
    await waitForFrame(lastFrame, "nord:const x = 1;");
  });

  it("disposes the highlighter on unmount", async () => {
    const shiki = createShiki();
    createHighlighterMock.mockResolvedValue(shiki);

    const { lastFrame, unmount } = render(
      <Probe theme="github-dark" langs={["javascript"]} />,
    );

    await waitForFrame(lastFrame, "github-dark:const x = 1;");
    expect(shiki.dispose).not.toHaveBeenCalled();

    unmount();
    await flushEffects();
    expect(shiki.dispose).toHaveBeenCalledOnce();
  });

  it("returns undefined when shiki import fails", async () => {
    createHighlighterMock.mockRejectedValue(new Error("not installed"));

    const { lastFrame } = render(
      <Probe theme="github-dark" langs={["javascript"]} />,
    );

    // Should stay "loading" (undefined) after the rejection settles
    await flushEffects();
    expect(lastFrame()).toContain("loading");
  });

  it("returns code unchanged when no lang is provided", async () => {
    const shiki = createShiki();
    const spy = vi.spyOn(shiki, "codeToTokensBase");
    createHighlighterMock.mockResolvedValue(shiki);

    const NoLang = () => {
      const highlighter = useShikiHighlighter();
      return <Text>{highlighter?.("raw code") ?? "loading"}</Text>;
    };

    const { lastFrame } = render(<NoLang />);
    await waitForFrame(lastFrame, "raw code");
    expect(spy).not.toHaveBeenCalled();
  });

  it("disposes in-flight highlighter when cancelled during creation", async () => {
    const slow = deferred<ReturnType<typeof createShiki>>();
    createHighlighterMock.mockReturnValueOnce(slow.promise);

    const { lastFrame, unmount } = render(
      <Probe theme="github-dark" langs={["javascript"]} />,
    );

    expect(lastFrame()).toContain("loading");

    // Unmount while still loading
    unmount();

    // Now resolve — the highlighter should be disposed immediately
    const shiki = createShiki();
    slow.resolve(shiki);
    await flushEffects();

    expect(shiki.dispose).toHaveBeenCalledOnce();
  });
});
