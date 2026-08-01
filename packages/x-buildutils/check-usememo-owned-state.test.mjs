import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeFile } from "./check-usememo-owned-state.mjs";

const run = (code) =>
  analyzeFile(
    "packages/store/src/fixture.ts",
    `import { useMemo } from "react";\n${code}`,
  );

test("flags a compiled factory whose returned methods capture containers (pre-#5411 NotificationManager shape)", async () => {
  const { violations } = await run(`
export const useNotifications = () => {
  return useMemo(() => {
    const listeners = new Map();
    const subscribers = new Set();
    return {
      on: (event, cb) => {
        listeners.set(event, cb);
        return () => listeners.delete(event);
      },
      subscribe: (cb) => {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
      },
    };
  }, []);
};
`);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reasons.join("; "), /`listeners` \(new Map\)/);
  assert.match(violations[0].reasons.join("; "), /`subscribers` \(new Set\)/);
});

test("flags the hoisted-methods variant of the same shape", async () => {
  const { violations } = await run(`
export const useEvents = () => {
  return useMemo(() => {
    const listeners = new Map();
    const on = (event, cb) => {
      listeners.set(event, cb);
    };
    const emit = (event) => listeners.get(event)?.();
    return { on, emit };
  }, []);
};
`);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reasons.join("; "), /`listeners` \(new Map\)/);
});

test("derived scratch stays clean: container filled by synchronous callbacks and copied out", async () => {
  const { candidates, violations } = await run(`
export const useUnique = (items) => {
  return useMemo(() => {
    const seen = new Set();
    const out = [];
    items.forEach((item) => {
      if (!seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    });
    return out;
  }, [items]);
};
`);
  assert.equal(candidates.length, 0);
  assert.equal(violations.length, 0);
});

test("hoisted helper invoked during the factory stays clean (MessageParts shape)", async () => {
  const { candidates, violations } = await run(`
export const useKeys = (ids) => {
  return useMemo(() => {
    const claimed = new Set();
    const keyFor = (id) => {
      if (!claimed.has(id)) {
        claimed.add(id);
        return "id:" + id;
      }
      return "fallback:" + id;
    };
    return ids.map((id) => keyFor(id));
  }, [ids]);
};
`);
  assert.equal(candidates.length, 0);
  assert.equal(violations.length, 0);
});

test("depth-2 mutation through a recomputable bundle stays clean (external-message-converter shape)", async () => {
  const { candidates, violations } = await run(`
export const useConverter = (callback, metadata, caches) => {
  const state = useMemo(
    () => ({ callback, metadata, ...caches }),
    [callback, metadata, caches],
  );
  return useMemo(() => {
    state.callbackCache.set(metadata, callback);
    return state;
  }, [state, metadata, callback]);
};
`);
  assert.equal(candidates.length, 0);
  assert.equal(violations.length, 0);
});

test("react-usememo-state-ok downgrades a violation to allowed", async () => {
  const { violations, allowed } = await run(`
export const useNotifications = () => {
  // react-usememo-state-ok
  return useMemo(() => {
    const listeners = new Map();
    return {
      on: (event, cb) => listeners.set(event, cb),
    };
  }, []);
};
`);
  assert.equal(violations.length, 0);
  assert.equal(allowed.length, 1);
});

test("branch (B) detects the cell pattern but stays dormant while the compiler bails on memo-result mutation", async () => {
  const { candidates, violations } = await run(`
export const useCell = (value) => {
  const cell = useMemo(() => ({}), []);
  cell.v = value;
  return cell;
};
`);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].reasons.join("; "), /`cell\.v = …`/);
  assert.equal(violations.length, 0);
});

test("read-only lookup over a derived container stays clean: escaping reads are recomputable", async () => {
  const { candidates, violations } = await run(`
export const useIndex = (items) => {
  return useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return { get: (id) => byId.get(id) };
  }, [items]);
};
`);
  assert.equal(candidates.length, 0);
  assert.equal(violations.length, 0);
});

test("derived scratch with an escaping read-only closure stays clean", async () => {
  const { candidates, violations } = await run(`
export const useUniqueWithLookup = (items) => {
  return useMemo(() => {
    const seen = new Set();
    const out = [];
    items.forEach((item) => {
      if (!seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    });
    return { out, has: (x) => seen.has(x) };
  }, [items]);
};
`);
  assert.equal(candidates.length, 0);
  assert.equal(violations.length, 0);
});

test("escaping read-only copy-out is conservatively flagged: non-member passthrough counts as mutation", async () => {
  const { candidates } = await run(`
export const useCopyOut = (items) => {
  return useMemo(() => {
    const seen = new Set(items);
    return { list: () => [...seen] };
  }, [items]);
};
`);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].reasons.join("; "), /`seen` \(new Set\)/);
});

test("mutation of the memo result inside a nested callback is excluded from branch (B)", async () => {
  const { candidates } = await run(`
export const useHandlerCache = () => {
  const cache = useMemo(() => ({}), []);
  const put = (k, v) => {
    cache[k] = v;
  };
  return { cache, put };
};
`);
  assert.equal(candidates.length, 0);
});

test("optional mutator call in an escaping closure still counts as owned", async () => {
  const { candidates } = await run(`
export const useOptional = () => {
  return useMemo(() => {
    const subs = new Set();
    return { subscribe: (cb) => subs?.add(cb) };
  }, []);
};
`);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].reasons.join("; "), /`subs` \(new Set\)/);
});

test("memo returning a locally named API object still flags", async () => {
  const { violations } = await run(`
export const useNamedApi = () => {
  return useMemo(() => {
    const listeners = new Map();
    const api = {
      on: (event, cb) => listeners.set(event, cb),
    };
    return api;
  }, []);
};
`);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reasons.join("; "), /`listeners` \(new Map\)/);
});

test("container allocation behind a type assertion still flags", async () => {
  const { violations } = await run(`
export const useAsserted = () => {
  return useMemo(() => {
    const listeners = new Map() as Map<string, () => void>;
    return { on: (event: string, cb: () => void) => listeners.set(event, cb) };
  }, []);
};
`);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reasons.join("; "), /`listeners` \(new Map\)/);
});

test("per-call allocation inside a returned function stays clean: not memo-owned state", async () => {
  const { candidates, violations } = await run(`
export const useFactory = () => {
  return useMemo(() => {
    return {
      make: () => {
        const m = new Map();
        m.set("a", 1);
        return m;
      },
    };
  }, []);
};
`);
  assert.equal(candidates.length, 0);
  assert.equal(violations.length, 0);
});

test("generic useMemo<T>() call is analyzed", async () => {
  const { violations } = await run(`
export const useNotifications = () => {
  return useMemo<{ on: (event: string, cb: () => void) => void }>(() => {
    const listeners = new Map();
    return { on: (event, cb) => listeners.set(event, cb) };
  }, []);
};
`);
  assert.equal(violations.length, 1);
});

test("aliased react import is detected but stays dormant: the compiler only erases the canonical name", async () => {
  const aliased = await analyzeFile(
    "packages/store/src/fixture.ts",
    `
import { useMemo as reactUseMemo } from "react";
export const useEvents = () => {
  return reactUseMemo(() => {
    const listeners = new Map();
    return { on: (event, cb) => listeners.set(event, cb) };
  }, []);
};
`,
  );
  assert.equal(aliased.candidates.length, 1);
  assert.equal(aliased.violations.length, 0);
});

test("a local shadowing useMemo is not matched", async () => {
  const shadowed = await run(`
export const helper = (useMemo) => {
  return useMemo(() => {
    const listeners = new Map();
    return { on: (event, cb) => listeners.set(event, cb) };
  }, []);
};
`);
  assert.equal(shadowed.candidates.length, 0);
});

test("tap's own useMemo is ignored: only the react import is flagged", async () => {
  const { candidates } = await analyzeFile(
    "packages/store/src/fixture.ts",
    `
import { useMemo } from "@assistant-ui/tap";
export const useNotifications = () => {
  return useMemo(() => {
    const listeners = new Map();
    return { on: (event, cb) => listeners.set(event, cb) };
  }, []);
};
`,
  );
  assert.equal(candidates.length, 0);
});
