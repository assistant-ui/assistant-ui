import { describe, expect, it } from "vitest";
import type { AssistantClient } from "../types/client";
import { createClientFacade } from "./client-facade";

const asClient = (value: object) => value as AssistantClient;

describe("createClientFacade", () => {
  it("forwards reads to the source's current client across swaps", () => {
    let client = asClient({ label: "first", ping: () => "one" });
    const facade = createClientFacade({
      getClient: () => client,
      subscribe: () => () => {},
    }) as AssistantClient & Record<string, any>;

    expect(facade.label).toBe("first");
    expect(facade.ping()).toBe("one");

    client = asClient({ label: "second", ping: () => "two" });
    expect(facade.label).toBe("second");
    expect(facade.ping()).toBe("two");
  });

  it("answers has, ownKeys, and descriptors from the live client", () => {
    const proto = { inherited: true };
    const client = asClient(Object.assign(Object.create(proto), { own: 1 }));
    const facade = createClientFacade({
      getClient: () => client,
      subscribe: () => () => {},
    });

    expect("own" in facade).toBe(true);
    expect("inherited" in facade).toBe(true);
    expect("missing" in facade).toBe(false);

    const keys = Object.keys(facade);
    expect(keys).toContain("own");
    expect(keys).toContain("inherited");

    expect(Object.getOwnPropertyDescriptor(facade, "own")?.value).toBe(1);
    expect(Object.getOwnPropertyDescriptor(facade, "missing")).toBeUndefined();
  });
});
