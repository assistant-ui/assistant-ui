// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { dimension, nativeColor } from "./theme";
import { byRole, cleanupSpecs, renderNativeSpec, spec } from "./testUtils";

const scheme = vi.hoisted(() => ({ current: "light" as "light" | "dark" }));

vi.mock("react-native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-native")>()),
  useColorScheme: () => scheme.current,
}));

afterEach(() => {
  cleanupSpecs();
  scheme.current = "light";
});

describe("React Native theme", () => {
  it("paints only colors React Native understands", () => {
    expect(["#123456", "red", "rgb(1, 2, 3)"].map(nativeColor)).toEqual([
      "#123456",
      "red",
      "rgb(1, 2, 3)",
    ]);
    expect(
      ["linear-gradient(red, blue)", "url(x.png)", 3].map(nativeColor),
    ).toEqual([undefined, undefined, undefined]);
  });

  it("reads lengths as points or percentages", () => {
    expect([12, "12px", "2rem", "50%", " 4 "].map(dimension)).toEqual([
      12,
      12,
      32,
      "50%",
      4,
    ]);
    expect(["auto", "1em", Number.NaN, undefined].map(dimension)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect([-1, "-1", "-2px", "-0.5rem", "-1%"].map(dimension)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("switches to the dark palette with the device", () => {
    scheme.current = "dark";
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Col", props: {}, children: ["text", "button"] },
        text: { type: "Text", props: { value: "Hi" } },
        button: { type: "Button", props: { label: "Go" } },
      }),
    );
    expect(container.querySelector<HTMLElement>("[dir]")!.style.color).toBe(
      "rgb(250, 250, 250)",
    );
    expect(byRole(container, "button", "Go").style.backgroundColor).toBe(
      "rgb(38, 38, 38)",
    );
  });
});
