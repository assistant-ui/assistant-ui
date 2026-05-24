import { describe, it, expect } from "vitest";
import { createResourceRoot, resource, tapResource } from "@assistant-ui/tap";
import {
  withAssistantTapContextProvider,
  type AssistantTapContextValue,
} from "@assistant-ui/store";
import { ToolCatalogs } from "../ToolCatalogs";
import type { ToolCatalog } from "../../..";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function makeStubClient(): any {
  return {
    source: "root" as const,
  };
}

function makeContextValue(client: any): AssistantTapContextValue {
  return {
    clientRef: { parent: client, current: client },
    emit: (() => {}) as any,
  };
}

const ToolCatalogsWrapper = resource((ctx: AssistantTapContextValue) => {
  return withAssistantTapContextProvider(ctx, () =>
    tapResource(ToolCatalogs()),
  );
});

const render = () => {
  const client = makeStubClient();
  const context = makeContextValue(client);
  const root = createResourceRoot();
  const sub = root.render(ToolCatalogsWrapper(context));
  return { sub, unmount: () => root.unmount() };
};

function makeCatalog(id: string): ToolCatalog {
  return {
    catalogId: id,
    search: async () => [],
    describe: async () => ({ description: "", parameters: {} }),
    execute: async () => undefined,
  };
}

describe("ToolCatalogs", () => {
  it("starts with empty state", () => {
    const { sub, unmount } = render();
    try {
      const state = sub.getValue().getState();
      expect(state.catalogIds).toEqual([]);
    } finally {
      unmount();
    }
  });

  it("register adds catalog to state", async () => {
    const { sub, unmount } = render();
    try {
      sub.getValue().register(makeCatalog("cat-a"));
      await tick();

      const state = sub.getValue().getState();
      expect(state.catalogIds).toContain("cat-a");
    } finally {
      unmount();
    }
  });

  it("get returns catalog by id", async () => {
    const { sub, unmount } = render();
    try {
      const catalog = makeCatalog("cat-b");
      sub.getValue().register(catalog);
      await tick();

      expect(sub.getValue().get("cat-b")).toBe(catalog);
    } finally {
      unmount();
    }
  });

  it("get returns undefined for unknown id", () => {
    const { sub, unmount } = render();
    try {
      expect(sub.getValue().get("nonexistent")).toBeUndefined();
    } finally {
      unmount();
    }
  });

  it("list returns all registered catalogs", async () => {
    const { sub, unmount } = render();
    try {
      const a = makeCatalog("alpha");
      const b = makeCatalog("beta");
      sub.getValue().register(a);
      sub.getValue().register(b);
      await tick();

      const list = sub.getValue().list();
      expect(list).toHaveLength(2);
      // list() returns in registration order (insertion order of Map)
      const ids = list.map((c: { catalogId: string }) => c.catalogId);
      expect(ids).toContain("alpha");
      expect(ids).toContain("beta");
    } finally {
      unmount();
    }
  });

  it("unsubscribe removes catalog from state", async () => {
    const { sub, unmount } = render();
    try {
      const unsub = sub.getValue().register(makeCatalog("removable"));
      await tick();
      expect(sub.getValue().getState().catalogIds).toContain("removable");

      unsub();
      await tick();
      expect(sub.getValue().getState().catalogIds).not.toContain("removable");
      expect(sub.getValue().list()).toHaveLength(0);
    } finally {
      unmount();
    }
  });

  it("duplicate catalogId registration throws", async () => {
    const { sub, unmount } = render();
    try {
      sub.getValue().register(makeCatalog("dup"));
      await tick();

      expect(() => {
        sub.getValue().register(makeCatalog("dup"));
      }).toThrow("Tool catalog 'dup' is already registered.");
    } finally {
      unmount();
    }
  });

  it("catalogIds are sorted alphabetically in state", async () => {
    const { sub, unmount } = render();
    try {
      sub.getValue().register(makeCatalog("zebra"));
      sub.getValue().register(makeCatalog("apple"));
      sub.getValue().register(makeCatalog("mango"));
      await tick();

      const state = sub.getValue().getState();
      expect(state.catalogIds).toEqual(["apple", "mango", "zebra"]);
    } finally {
      unmount();
    }
  });

  it("state reference stability: getState() returns same object when nothing changes", () => {
    const { sub, unmount } = render();
    try {
      const s1 = sub.getValue().getState();
      const s2 = sub.getValue().getState();
      expect(s1).toBe(s2);
    } finally {
      unmount();
    }
  });

  it("multiple catalogs: each is retrievable individually", async () => {
    const { sub, unmount } = render();
    try {
      const c1 = makeCatalog("c1");
      const c2 = makeCatalog("c2");
      sub.getValue().register(c1);
      sub.getValue().register(c2);
      await tick();

      expect(sub.getValue().get("c1")).toBe(c1);
      expect(sub.getValue().get("c2")).toBe(c2);
    } finally {
      unmount();
    }
  });
});
