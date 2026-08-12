import { describe, it, expect, vi } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { use } from "../../react-hooks/use";
import { useState } from "../../react-hooks/useState";

describe("createTapRoot suspense", () => {
  it("throws a clear error when the initial render suspends", () => {
    expect(() => createTapRoot(() => use(new Promise(() => {})))).toThrow(
      "createTapRoot suspended during its initial render",
    );
  });

  it("holds the committed value while an update suspends and converges on resolve", async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    let bump!: (value: number) => void;

    const root = createTapRoot(() => {
      const [count, setCount] = useState(0);
      bump = setCount;
      return count === 0 ? "sync" : (use(promise) as string);
    });

    const seen: string[] = [];
    root.subscribe(() => seen.push(root.getValue()));
    expect(root.getValue()).toBe("sync");

    flushTapSync(() => bump(1));
    expect(root.getValue()).toBe("sync");
    expect(seen).toEqual([]);

    resolve("async");
    await promise;
    await vi.waitFor(() => expect(root.getValue()).toBe("async"));
    expect(seen).toEqual(["async"]);

    root.unmount();
  });
});
