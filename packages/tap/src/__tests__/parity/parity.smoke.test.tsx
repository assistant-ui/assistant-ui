/* oxlint-disable react/exhaustive-deps -- intentional patterns are part of the scenarios */
import { describe, it, expect } from "vitest";
import { useEffect, useState } from "react";
import {
  describeParity,
  isDevMode,
  runScenario,
  type Scenario,
} from "./describeParity";

describe("harness smoke", () => {
  it("runs against the React build matching the project mode", () => {
    expect(process.env.NODE_ENV === "production").toBe(!isDevMode);
  });

  it("react env observes StrictMode double render only in dev", async () => {
    const scenario: Scenario = {
      name: "",
      use: (log) => log("render"),
    };
    const events = await runScenario("react", scenario);
    expect(events).toEqual(isDevMode ? ["render", "render"] : ["render"]);
  });
});

describeParity([
  {
    name: "smoke: mount, effect, event-handler setState",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      useEffect(() => {
        log(`effect ${count}`);
        return () => log(`cleanup ${count}`);
      }, [count]);
      return { increment: () => setCount((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().increment());
    },
    unmountAtEnd: true,
  },
]);
