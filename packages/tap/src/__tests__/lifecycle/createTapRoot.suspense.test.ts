import { describe, it, expect, vi } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { use } from "../../react-hooks/use";
import { useState } from "../../react-hooks/useState";

describe("createTapRoot suspense", () => {
  it("throws a clear error when the initial render suspends", () => {
    expect(() =>
      createTapRoot(function InitialSuspend() {
        return use(new Promise(() => {}));
      }),
    ).toThrow("createTapRoot suspended during its initial render");
  });

  it("holds the committed value while an update suspends and converges on resolve", async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    let bump!: (value: number) => void;

    const root = createTapRoot(function UpdateSuspend() {
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

  it("re-arms a suspended update when a mountOnSubscribe root reconnects", async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    let bump!: (value: number) => void;

    const root = createTapRoot(
      function Reconnect() {
        const [count, setCount] = useState(0);
        bump = setCount;
        return count === 0 ? "sync" : (use(promise) as string);
      },
      { mountOnSubscribe: true },
    );

    const unsubscribe = root.subscribe(() => {});
    expect(root.getValue()).toBe("sync");

    flushTapSync(() => bump(1));
    unsubscribe();
    await new Promise((r) => setTimeout(r, 10));

    resolve("async");
    await promise;
    await new Promise((r) => setTimeout(r, 10));
    expect(root.getValue()).toBe("sync");

    root.subscribe(() => {});
    await vi.waitFor(() => expect(root.getValue()).toBe("async"));
  });
});
