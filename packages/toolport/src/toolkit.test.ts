import { describe, expect, it } from "vitest";
import { weather } from "./__tests__/weather";
import { callTool, listTools, ToolError, validateArgs } from "./toolkit";

describe("listTools", () => {
  it("describes every tool with its JSON schema", () => {
    expect(listTools(weather).map((t) => t.name)).toEqual([
      "getWeather",
      "fail",
    ]);
    expect(listTools(weather)[0]).toMatchObject({
      description: "Get the current weather for a location.",
      inputSchema: { type: "object", required: ["location"] },
    });
  });
});

describe("validateArgs", () => {
  const schema = weather.tools.getWeather.parameters;

  it("accepts valid arguments", () => {
    expect(validateArgs(schema, { location: "Berlin", days: 3 })).toEqual([]);
  });

  it("reports missing required, wrong types, and enum violations", () => {
    expect(validateArgs(schema, { days: "3", unit: "kelvin" })).toEqual([
      'missing required argument "location"',
      '"unit" must be one of celsius, fahrenheit',
      '"days" expected integer, got string',
    ]);
  });

  it("rejects non-object arguments", () => {
    expect(validateArgs(schema, "Berlin")).toEqual([
      "expected object, got string",
    ]);
  });
});

describe("callTool", () => {
  it("executes a tool with a context", async () => {
    await expect(
      callTool(weather, "getWeather", { location: "Berlin" }),
    ).resolves.toMatchObject({
      location: "Berlin",
      unit: "celsius",
    });
  });

  it("throws typed errors", async () => {
    await expect(callTool(weather, "nope", {})).rejects.toMatchObject({
      code: "unknown_tool",
    });
    await expect(callTool(weather, "getWeather", {})).rejects.toMatchObject({
      code: "invalid_args",
    });
    await expect(callTool(weather, "fail", {})).rejects.toMatchObject({
      code: "execution_failed",
      message: "boom",
    });
    await expect(callTool(weather, "toString", {})).rejects.toBeInstanceOf(
      ToolError,
    );
  });
});
