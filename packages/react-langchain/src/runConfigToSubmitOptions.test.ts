import { describe, expect, it } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import { runConfigToSubmitOptions } from "./useStreamRuntime";

type RunConfig = AppendMessage["runConfig"];

describe("runConfigToSubmitOptions", () => {
  it("returns undefined when runConfig is undefined", () => {
    expect(runConfigToSubmitOptions(undefined)).toBeUndefined();
  });

  it("returns undefined when custom is undefined", () => {
    expect(
      runConfigToSubmitOptions({ custom: undefined } as unknown as RunConfig),
    ).toBeUndefined();
  });

  it("maps custom to config.configurable", () => {
    const runConfig = { custom: { mode: "plan" } } as RunConfig;
    expect(runConfigToSubmitOptions(runConfig)).toEqual({
      config: { configurable: { mode: "plan" } },
    });
  });
});
