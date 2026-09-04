import { describe, expect, it } from "vitest";
import { parseToolArgs, runCli } from "./cli";
import { weather } from "./__tests__/weather";

const run = async (...argv: string[]) => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runCli(weather, {
    argv,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });
  return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
};

describe("parseToolArgs", () => {
  const schema = weather.tools.getWeather.parameters;

  it("coerces flags by schema type", () => {
    expect(
      parseToolArgs(schema, ["--location", "Berlin", "--days=3", "--verbose"]),
    ).toEqual({
      location: "Berlin",
      days: 3,
      verbose: true,
    });
  });

  it("merges --json with flags", () => {
    expect(
      parseToolArgs(schema, ["--json", '{"location":"Oslo"}', "--days", "2"]),
    ).toEqual({
      location: "Oslo",
      days: 2,
    });
  });

  it("rejects unknown flags and bad numbers", () => {
    expect(() => parseToolArgs(schema, ["--nope", "1"])).toThrow(
      "unknown flag --nope",
    );
    expect(() => parseToolArgs(schema, ["--days", "x"])).toThrow(
      "expected a number",
    );
  });
});

describe("runCli", () => {
  it("prints usage without a command", async () => {
    const { code, stdout } = await run();
    expect(code).toBe(1);
    expect(stdout).toContain("usage: weather <tool>");
    expect(stdout).toContain("getWeather");
  });

  it("lists tools as JSON", async () => {
    const { code, stdout } = await run("list");
    expect(code).toBe(0);
    expect(JSON.parse(stdout)[0].name).toBe("getWeather");
  });

  it("prints per-tool help", async () => {
    const { stdout } = await run("getWeather", "--help");
    expect(stdout).toContain("--location <string> (required)");
  });

  it("runs a tool and prints the result", async () => {
    const { code, stdout } = await run(
      "getWeather",
      "--location",
      "Berlin",
      "--unit",
      "fahrenheit",
    );
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      location: "Berlin",
      unit: "fahrenheit",
    });
  });

  it("reports errors on stderr with exit code 1", async () => {
    expect(await run("getWeather")).toMatchObject({
      code: 1,
      stderr: 'missing required argument "location"',
    });
    expect(await run("fail")).toMatchObject({ code: 1, stderr: "boom" });
    expect((await run("nope")).stderr).toContain('unknown tool "nope"');
  });
});
