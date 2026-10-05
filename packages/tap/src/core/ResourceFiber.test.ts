import { describe, expect, it } from "vitest";
import {
  commitResourceFiber,
  createResourceFiber,
  renderResourceFiber,
  unmountResourceFiber,
} from "./ResourceFiber";
import { createResourceFiberRoot } from "./helpers/root";
import { useEffect } from "../react-hooks/useEffect";
import { useInsertionEffect } from "../react-hooks/useInsertionEffect";

describe("host cell release", () => {
  it.each([false, true])(
    "propagates permanence through single and keyed hosts after soft unmount: %s",
    (disconnectFirst) => {
      const events: string[] = [];
      const makeFiber = (name: string) => {
        const fiber = createResourceFiber(
          function useEffects() {
            useInsertionEffect(
              () => () => events.push(`${name} insertion`),
              [],
            );
            useEffect(() => () => events.push(`${name} passive`), []);
          },
          createResourceFiberRoot(() => {}),
          undefined,
          null,
        );
        renderResourceFiber(fiber, []);
        commitResourceFiber(fiber);
        return fiber;
      };
      const parent = makeFiber("parent");
      const child = makeFiber("child");
      const first = makeFiber("first");
      const second = makeFiber("second");
      const grandchild = makeFiber("grandchild");
      parent.hostCells = [
        { type: "host", fiber: child, fibers: null },
        {
          type: "host",
          fiber: null,
          fibers: new Map<string | number, { fiber: typeof first }>([
            ["first", { fiber: first }],
            [2, { fiber: second }],
          ]),
        },
      ];
      child.hostCells = [{ type: "host", fiber: grandchild, fibers: null }];

      if (disconnectFirst) {
        unmountResourceFiber(parent, false);
        expect(events).toEqual([
          "parent passive",
          "child passive",
          "grandchild passive",
          "first passive",
          "second passive",
        ]);
        for (const fiber of [parent, child, first, second, grandchild]) {
          expect(fiber.isMounted).toBe(false);
          expect(fiber.isReleased).toBe(false);
        }
        events.length = 0;
      }

      unmountResourceFiber(parent);
      unmountResourceFiber(parent);
      const order = [
        "parent insertion",
        "child insertion",
        "grandchild insertion",
        "first insertion",
        "second insertion",
        "parent passive",
        "child passive",
        "grandchild passive",
        "first passive",
        "second passive",
      ];
      expect(events).toEqual(
        disconnectFirst
          ? order.filter((event) => event.endsWith("insertion"))
          : order,
      );
      for (const fiber of [parent, child, first, second, grandchild]) {
        expect(fiber.isMounted).toBe(false);
        expect(fiber.isReleased).toBe(true);
      }
    },
  );

  it.each([
    "parent insertion",
    "child insertion",
    "parent passive",
    "child passive",
  ])("completes both cleanup passes when %s throws", (failedEffect) => {
    const failure = new Error("Cleanup failed");
    const events: string[] = [];
    const cleanup = (effect: string) => {
      events.push(effect);
      if (effect === failedEffect) throw failure;
    };
    const makeFiber = (name: string) => {
      const fiber = createResourceFiber(
        function useCleanup() {
          useInsertionEffect(() => () => cleanup(`${name} insertion`), []);
          useEffect(() => () => cleanup(`${name} passive`), []);
        },
        createResourceFiberRoot(() => {}),
        undefined,
        null,
      );
      renderResourceFiber(fiber, []);
      commitResourceFiber(fiber);
      return fiber;
    };
    const parent = makeFiber("parent");
    const child = makeFiber("child");
    const sibling = makeFiber("sibling");
    parent.hostCells = [
      {
        type: "host",
        fiber: null,
        fibers: new Map([
          ["child", { fiber: child }],
          ["sibling", { fiber: sibling }],
        ]),
      },
    ];

    expect(() => unmountResourceFiber(parent)).toThrow(failure);
    expect(() => unmountResourceFiber(parent)).not.toThrow();
    expect(events).toEqual([
      "parent insertion",
      "child insertion",
      "sibling insertion",
      "parent passive",
      "child passive",
      "sibling passive",
    ]);
  });
});
