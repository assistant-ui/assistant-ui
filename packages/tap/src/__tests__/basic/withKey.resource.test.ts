import { describe, it, expect, afterEach } from "vitest";
import { resource } from "../../core/resource";
import { withKey } from "../../core/withKey";
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

const ConnectionResource = (options: ConnectionOptions) =>
  withKey(options.id, resource(useConnection).bind(null, options));

describe("withKey on a Resource", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  it("stamps the key onto every produced element", () => {
    const Keyed = withKey("conn-1", resource(useConnection));

    const el1 = Keyed({ id: "a", initial: 0 }, { mult: 1 });
    const el2 = Keyed({ id: "b", initial: 5 }, { mult: 2 });

    expect(el1.key).toBe("conn-1");
    expect(el2.key).toBe("conn-1");
    expect(el1.hook).toBe(useConnection);
    expect(el1.args).toEqual([{ id: "a", initial: 0 }, { mult: 1 }]);
  });

  it("threads .bind args through to the hook", () => {
    const el = ConnectionResource({ id: "ws-1", initial: 3 })({ mult: 10 });

    expect(el.key).toBe("ws-1");

    const testFiber = createTestResource(() => useResources([el]));
    const [conn] = renderTest(testFiber);
    expect(conn).toMatchObject({ id: "ws-1", value: 30 });
  });

  it("reconciles keyed curried resources by key across reorder", () => {
    const a = ConnectionResource({ id: "a", initial: 1 });
    const b = ConnectionResource({ id: "b", initial: 20 });

    const testFiber = createTestResource(
      (props: { conns: ReturnType<typeof ConnectionResource>[] }) =>
        useResources(props.conns.map((conn) => conn({ mult: 1 }))),
    );

    const result1 = renderTest(testFiber, { conns: [a, b] });
    expect(result1.map((c: any) => c.value)).toEqual([1, 20]);

    result1[0]!.bump();

    const result2 = renderTest(testFiber, { conns: [b, a] });
    expect(result2.map((c: any) => c.id)).toEqual(["b", "a"]);
    expect(result2.map((c: any) => c.value)).toEqual([20, 2]);
  });
});
