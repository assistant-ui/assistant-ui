import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readThemeTokens } from "../theme";
import { useThemeTokens } from "./useThemeTokens";

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  vi.restoreAllMocks();
});

const frame = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 40)));

function Probe({ onTokens }: { onTokens: (scheme: string) => void }) {
  const tokens = useThemeTokens();
  onTokens(tokens.colorScheme);
  return null;
}

describe("useThemeTokens", () => {
  it("renders the page's tokens on the first client render", () => {
    document.documentElement.className = "dark";
    const seen: string[] = [];
    render(<Probe onTokens={(scheme) => seen.push(scheme)} />);
    expect(seen[0]).toBe("dark");
  });

  it("reads once per theme change for many widgets and ignores body style", async () => {
    const spy = vi.spyOn(window, "getComputedStyle");
    const seen: string[] = [];
    render(
      <>
        {Array.from({ length: 30 }, (_, i) => (
          <Probe key={i} onTokens={(scheme) => seen.push(scheme)} />
        ))}
      </>,
    );
    await frame();
    spy.mockClear();
    seen.length = 0;

    document.body.style.overflow = "hidden";
    await frame();
    expect(spy).not.toHaveBeenCalled();

    document.documentElement.className = "dark";
    document.documentElement.classList.add("x");
    await frame();
    const calls = spy.mock.calls.length;
    spy.mockClear();
    readThemeTokens(document.documentElement);
    expect(calls).toBe(spy.mock.calls.length);
    expect(seen).toHaveLength(30);
    expect(new Set(seen)).toEqual(new Set(["dark"]));
  });

  it("re-reads on body style only when asked to", async () => {
    const spy = vi.spyOn(window, "getComputedStyle");
    function BodyProbe() {
      useThemeTokens(undefined, undefined, { observeBodyStyle: true });
      return null;
    }
    render(<BodyProbe />);
    await frame();
    spy.mockClear();
    document.body.style.setProperty("--background", "black");
    await frame();
    expect(spy).toHaveBeenCalled();
  });
});
