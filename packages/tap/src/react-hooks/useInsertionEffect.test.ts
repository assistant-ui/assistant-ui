import { describe, expect, it, vi } from "vitest";
import { useInsertionEffect } from "react";
import { useInsertionEffect as useShimInsertionEffect } from "../react-shim";
import { useInsertionEffect as useStandaloneInsertionEffect } from "../standalone-shim";
import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "../core/ResourceFiber";
import { createResourceFiberRoot } from "../core/helpers/root";
import { useEffect } from "./useEffect";
import { useInsertionEffect as useTapInsertionEffect } from "./useInsertionEffect";

describe("insertion effect cells", () => {
  it.each([
    ["tap hook", useTapInsertionEffect],
    ["dispatcher", useInsertionEffect],
    ["React shim", useShimInsertionEffect],
    ["standalone shim", useStandaloneInsertionEffect],
  ] as const)(
    "%s preserves insertion effects until permanent release",
    (_, useInsertion) => {
      const setup = vi.fn();
      const cleanup = vi.fn();
      const passiveCleanup = vi.fn();
      const fiber = createResourceFiber(
        function useEffects() {
          useInsertion(() => {
            setup();
            return cleanup;
          }, []);
          useEffect(() => passiveCleanup, []);
        },
        createResourceFiberRoot(() => {}),
        undefined,
        "root",
      );

      renderResourceFiber(fiber, []);
      commitResourceFiber(fiber);
      expect(setup).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();
      expect(passiveCleanup).toHaveBeenCalledTimes(1);
      expect(fiber.isMounted).toBe(true);
      expect(fiber.isReleased).toBe(false);

      unmountResourceFiber(fiber, false);
      expect(fiber.isMounted).toBe(false);
      expect(fiber.isReleased).toBe(false);
      expect(cleanup).not.toHaveBeenCalled();
      expect(passiveCleanup).toHaveBeenCalledTimes(2);

      commitResourceFiber(fiber);
      expect(setup).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();

      unmountResourceFiber(fiber, false);
      unmountResourceFiber(fiber);
      unmountResourceFiber(fiber);
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(fiber.isReleased).toBe(true);
    },
  );

  it("does not replay dependency-less insertion effects in StrictMode or on reconnect", () => {
    const events: string[] = [];
    const fiber = createResourceFiber(
      function useInsertion() {
        useInsertionEffect(() => {
          events.push("setup");
          return () => {
            events.push("cleanup");
          };
        });
      },
      createResourceFiberRoot(() => {}),
      undefined,
      "root",
    );

    renderResourceFiber(fiber, []);
    renderResourceFiber(fiber, []);
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup"]);

    unmountResourceFiber(fiber, false);
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup"]);

    renderResourceFiber(fiber, []);
    commitResourceFiber(fiber);
    expect(events).toEqual(["setup", "cleanup", "setup"]);

    unmountResourceFiber(fiber);
    expect(events).toEqual(["setup", "cleanup", "setup", "cleanup"]);
  });

  it("reconciles changed insertion dependencies before passive cleanup and setup", () => {
    const events: string[] = [];
    const fiber = createResourceFiber(
      function useEffects(value: number) {
        useEffect(() => {
          events.push(`passive setup ${value}`);
          return () => events.push(`passive cleanup ${value}`);
        }, [value]);
        useInsertionEffect(() => {
          events.push(`insertion setup ${value}`);
          return () => {
            events.push(`insertion cleanup ${value}`);
          };
        }, [value]);
      },
      createResourceFiberRoot(() => {}),
      undefined,
      null,
    );

    renderResourceFiber(fiber, [0]);
    commitResourceFiber(fiber);
    expect(events).toEqual(["insertion setup 0", "passive setup 0"]);

    events.length = 0;
    renderResourceFiber(fiber, [0]);
    commitResourceFiber(fiber);
    expect(events).toEqual([]);

    renderResourceFiber(fiber, [1]);
    commitResourceFiber(fiber);
    expect(events).toEqual([
      "insertion cleanup 0",
      "insertion setup 1",
      "passive cleanup 0",
      "passive setup 1",
    ]);

    events.length = 0;
    unmountResourceFiber(fiber);
    expect(events).toEqual(["insertion cleanup 1", "passive cleanup 1"]);
  });

  it.each([false, true])(
    "rejects switching effect kinds with insertion first: %s",
    (insertionFirst) => {
      const fiber = createResourceFiber(
        function useSwitchingEffect(insertion: boolean) {
          const useEffectKind = insertion ? useInsertionEffect : useEffect;
          useEffectKind(() => {}, []);
        },
        createResourceFiberRoot(() => {}),
        undefined,
        null,
      );

      renderResourceFiber(fiber, [insertionFirst]);
      commitResourceFiber(fiber);
      expect(() => renderResourceFiber(fiber, [!insertionFirst])).toThrow(
        "Hook order changed between renders",
      );
      unmountResourceFiber(fiber);
    },
  );

  it("keeps insertion and host storage null on passive-only fibers", () => {
    const fiber = createResourceFiber(
      function usePassive() {
        useEffect(() => {}, []);
      },
      createResourceFiberRoot(() => {}),
      undefined,
      null,
    );

    expect(fiber.insertionCells).toBe(null);
    expect(fiber.hostCells).toBe(null);
    renderResourceFiber(fiber, []);
    commitResourceFiber(fiber);
    unmountResourceFiber(fiber);
    expect(fiber.insertionCells).toBe(null);
    expect(fiber.hostCells).toBe(null);
  });

  it("continues passive reconciliation and cleanup after insertion errors", () => {
    const failure = new Error("Insertion cleanup failed");
    const passiveSetup = vi.fn();
    const passiveCleanup = vi.fn();
    const insertionCleanup = vi.fn(() => {
      throw failure;
    });
    const fiber = createResourceFiber(
      function useEffects(value: number) {
        useInsertionEffect(() => insertionCleanup, [value]);
        useEffect(() => {
          passiveSetup(value);
          return passiveCleanup;
        }, [value]);
      },
      createResourceFiberRoot(() => {}),
      undefined,
      null,
    );

    renderResourceFiber(fiber, [0]);
    commitResourceFiber(fiber);
    renderResourceFiber(fiber, [1]);
    expect(() => commitResourceFiber(fiber)).toThrow(failure);
    expect(passiveSetup).toHaveBeenLastCalledWith(1);
    expect(passiveCleanup).toHaveBeenCalledTimes(1);

    expect(() => unmountResourceFiber(fiber)).toThrow(failure);
    expect(passiveCleanup).toHaveBeenCalledTimes(2);
    expect(fiber.isMounted).toBe(false);
    expect(() => unmountResourceFiber(fiber)).not.toThrow();
    expect(insertionCleanup).toHaveBeenCalledTimes(2);
  });
});
