import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "ink-testing-library";
import { renderFrame } from "./helpers";

const capturedProps = vi.fn();

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    MessagePrimitiveParts: (props: unknown) => {
      capturedProps(props);
      return null;
    },
  };
});

const { MessagePrimitive } = await import("../index");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const lastComponents = () => {
  const call = capturedProps.mock.calls.at(-1);
  if (!call) throw new Error("MessagePrimitivePartsBase was not rendered");
  return (call[0] as { components: Record<string, unknown> }).components;
};

describe("MessagePrimitive.Parts", () => {
  it("forwards data and Quote alongside ChainOfThought", async () => {
    const ChainOfThought = () => null;
    const Quote = () => null;
    const WeatherCard = () => null;

    await renderFrame(
      <MessagePrimitive.Parts
        components={{
          ChainOfThought,
          Quote,
          data: { by_name: { weather: WeatherCard } },
        }}
      />,
    );

    const components = lastComponents();
    expect(components.ChainOfThought).toBe(ChainOfThought);
    expect(components.Quote).toBe(Quote);
    expect(
      (components.data as { by_name: Record<string, unknown> }).by_name.weather,
    ).toBe(WeatherCard);
  });

  it("does not include reasoning/tool slots when ChainOfThought is set", async () => {
    const ChainOfThought = () => null;

    await renderFrame(
      <MessagePrimitive.Parts components={{ ChainOfThought }} />,
    );

    const components = lastComponents();
    expect(components).not.toHaveProperty("Reasoning");
    expect(components).not.toHaveProperty("tools");
    expect(components).not.toHaveProperty("ToolGroup");
    expect(components).not.toHaveProperty("ReasoningGroup");
  });

  it("forwards data and Quote in the standard branch", async () => {
    const Quote = () => null;
    const WeatherCard = () => null;

    await renderFrame(
      <MessagePrimitive.Parts
        components={{
          Quote,
          data: { by_name: { weather: WeatherCard } },
        }}
      />,
    );

    const components = lastComponents();
    expect(components.Quote).toBe(Quote);
    expect(
      (components.data as { by_name: Record<string, unknown> }).by_name.weather,
    ).toBe(WeatherCard);
    expect(components.ChainOfThought).toBeUndefined();
  });

  it("injects ink data.Fallback when components is omitted", async () => {
    await renderFrame(<MessagePrimitive.Parts />);

    const components = lastComponents();
    expect(typeof (components.data as { Fallback: unknown }).Fallback).toBe(
      "function",
    );
  });

  it("preserves caller data.Fallback when provided", async () => {
    const CustomFallback = () => null;

    await renderFrame(
      <MessagePrimitive.Parts
        components={{ data: { Fallback: CustomFallback } }}
      />,
    );

    const components = lastComponents();
    expect((components.data as { Fallback: unknown }).Fallback).toBe(
      CustomFallback,
    );
  });
});
