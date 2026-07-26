import { describe, it, expect, afterEach } from "vitest";
import { configurableResource } from "../../core/configurableResource";
import { withKey } from "../../core/withKey";
import { useResource } from "../../hooks/useResource";
import { useResources } from "../../hooks/useResources";
import { useState } from "../../react-hooks/useState";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
} from "../test-utils";

type ConnectionOptions = { id: string; initial: number };
type ConnectionProps = { mult: number };

const useConnection = (options: ConnectionOptions, props: ConnectionProps) => {
  const [count, setCount] = useState(options.initial);
  return {
    id: options.id,
    value: count * props.mult,
    bump: () => setCount((c) => c + 1),
  };
};

const ConnectionResource = configurableResource(useConnection);

describe("configurableResource", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  it("bakes options into the factory and applies args later", () => {
    const conn = ConnectionResource({ id: "ws-1", initial: 3 });
    const el = conn({ mult: 10 });

    expect(el.hook).toBe(useConnection);
    expect(el.args).toEqual([{ id: "ws-1", initial: 3 }, { mult: 10 }]);

    const testFiber = createTestResource(() => useResource(el));
    const result = renderTest(testFiber);
    expect(result).toMatchObject({ id: "ws-1", value: 30 });
  });

  it("reuses the fiber across re-application", () => {
    const conn = ConnectionResource({ id: "c-1", initial: 1 });

    const testFiber = createTestResource((props: ConnectionProps) =>
      useResource(conn(props)),
    );

    const result1 = renderTest(testFiber, { mult: 1 });
    expect(result1.value).toBe(1);

    result1.bump();

    const result2 = renderTest(testFiber, { mult: 10 });
    expect(result2.value).toBe(20);
  });

  it("composes with caller-side withKey", () => {
    const a = withKey("a", ConnectionResource({ id: "a", initial: 1 }));
    const b = withKey("b", ConnectionResource({ id: "b", initial: 20 }));

    expect(a({ mult: 1 }).key).toBe("a");

    const testFiber = createTestResource((props: { conns: (typeof a)[] }) =>
      useResources(props.conns.map((conn) => conn({ mult: 1 }))),
    );

    const result1 = renderTest(testFiber, { conns: [a, b] });
    expect(result1.map((c) => c.value)).toEqual([1, 20]);

    result1[0]!.bump();

    const result2 = renderTest(testFiber, { conns: [b, a] });
    expect(result2.map((c) => c.id)).toEqual(["b", "a"]);
    expect(result2.map((c) => c.value)).toEqual([20, 2]);
  });
});
