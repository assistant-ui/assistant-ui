import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "../../core/resource";
import { createTapRoot } from "../../core/createTapRoot";
import { withKey } from "../../core/withKey";
import { useResource } from "../../hooks/useResource";
import { useResourceDispose } from "../../hooks/useResourceDispose";
import { useResources } from "../../hooks/useResources";
import {
  cleanupAllResources,
  createTestResource,
  renderTest,
  waitForNextTick,
} from "../test-utils";

describe("resource disposal", () => {
  afterEach(cleanupAllResources);

  it("disposes the previous hook when useResource replaces it", () => {
    const disposeFirst = vi.fn();
    const disposeSecond = vi.fn();
    const First = resource(function useFirst() {
      useResourceDispose(disposeFirst);
    });
    const Second = resource(function useSecond() {
      useResourceDispose(disposeSecond);
    });
    const parent = createTestResource((second: boolean) =>
      useResource(second ? Second() : First()),
    );

    renderTest(parent, false);
    renderTest(parent, true);

    expect(disposeFirst).toHaveBeenCalledOnce();
    expect(disposeSecond).not.toHaveBeenCalled();
  });

  it("disposes nested resources with their owner", () => {
    const disposeInner = vi.fn();
    const Inner = resource(function useInner() {
      useResourceDispose(disposeInner);
    });
    const First = resource(function useFirst() {
      return useResource(Inner());
    });
    const Second = resource(function useSecond() {});
    const parent = createTestResource((second: boolean) =>
      useResource(second ? Second() : First()),
    );

    renderTest(parent, false);
    renderTest(parent, true);

    expect(disposeInner).toHaveBeenCalledOnce();
  });

  it("disposes keyed resources when they are replaced or removed", () => {
    const disposeFirst = vi.fn();
    const disposeSecond = vi.fn();
    const First = resource(function useFirst() {
      useResourceDispose(disposeFirst);
    });
    const Second = resource(function useSecond() {
      useResourceDispose(disposeSecond);
    });
    const parent = createTestResource((state: "first" | "second" | "removed") =>
      useResources(
        state === "removed"
          ? []
          : [withKey("item", state === "first" ? First() : Second())],
      ),
    );

    renderTest(parent, "first");
    renderTest(parent, "second");
    expect(disposeFirst).toHaveBeenCalledOnce();
    expect(disposeSecond).not.toHaveBeenCalled();

    renderTest(parent, "removed");
    expect(disposeSecond).toHaveBeenCalledOnce();
  });

  it("disposes an explicitly unmounted root", () => {
    const dispose = vi.fn();
    const root = createTapRoot(function Root() {
      useResourceDispose(dispose);
    });

    root.unmount();

    expect(dispose).toHaveBeenCalledOnce();
  });

  it("preserves disposal callbacks across mount-on-subscribe soft unmounts", async () => {
    const dispose = vi.fn();
    const root = createTapRoot(
      function Root() {
        useResourceDispose(dispose);
      },
      { mountOnSubscribe: true },
    );

    const unsubscribe = root.subscribe(() => {});
    unsubscribe();
    await waitForNextTick();
    expect(dispose).not.toHaveBeenCalled();

    const unsubscribeAgain = root.subscribe(() => {});
    expect(dispose).not.toHaveBeenCalled();
    unsubscribeAgain();
    await waitForNextTick();
  });
});
