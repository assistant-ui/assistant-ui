import { afterEach, expect, it, vi } from "vitest";
import { initializeStreamfold } from "./index";
import { IncrementalJsonObjectParser } from "../utils/json/incremental-json-object-parser";

afterEach(() => vi.unstubAllGlobals());

it("continues with the native parser when WASM or finalization is unavailable", async () => {
  vi.stubGlobal("FinalizationRegistry", undefined);
  expect(await initializeStreamfold()).toBe(false);
  expect(
    IncrementalJsonObjectParser.from('{"value":"').append('ok"}').currentArgs,
  ).toMatchObject({ value: "ok" });
  vi.unstubAllGlobals();
  vi.stubGlobal("WebAssembly", undefined);
  expect(await initializeStreamfold()).toBe(false);
  expect(
    IncrementalJsonObjectParser.from('{"value":"').append('fallback"}')
      .currentArgs,
  ).toMatchObject({ value: "fallback" });
});
