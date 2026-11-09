import { RemoteComponentError } from "./errors.js";

/**
 * Value codec.
 *
 * Values cross the boundary with the structured clone algorithm
 * (postMessage). Structured clone cannot carry functions, so before sending
 * we walk the value, replace every function with `null`, and record where it
 * was as a *path*. The receiver puts a proxy back at each path.
 *
 * Functions are addressed by `(scope, path)`, not by identity: a call through
 * a proxy invokes whatever function lives at that path in the sender's
 * *latest* value for that scope ("latest-ref" semantics, like
 * `useEffectEvent`). Consequences:
 *   - Re-rendering the host with a new inline arrow function sends nothing.
 *   - Proxies are stable across updates, so `useEffect([props.onX])` in the
 *     remote does not re-run on every host render.
 *   - No reference counting or GC is needed: handles die with their scope.
 *
 * Rules (also in SPEC.md §Values):
 *   - Plain objects and arrays are walked. Functions at any depth inside them
 *     become proxies (when `allowFunctions`).
 *   - Date, RegExp, Map, Set, ArrayBuffer, typed arrays, DataView, Blob, File,
 *     Error, bigint, undefined, NaN, -0 and boxed primitives pass through to
 *     structured clone. Map/Set contents are checked but never walked for
 *     functions: a function inside a Map/Set is a `data` error.
 *   - Instances of other classes are copied as plain objects of their own
 *     enumerable string keys (the prototype is dropped, like structured clone).
 *   - Symbols, Promises, WeakMap/WeakSet/WeakRef, DOM nodes and windows are
 *     `data` errors. Symbol-keyed properties are ignored.
 *   - Shared references and cycles are preserved.
 */

export type PathKey = string | number;
export type Path = readonly PathKey[];

export interface Encoded {
  /** The structured-cloneable value with functions replaced by `null`. */
  v: unknown;
  /** Paths (into `v`) where functions were. Omitted when empty. */
  f?: Path[];
  /** Paths where AbortSignals were (call arguments only). Omitted when empty. */
  s?: Path[];
}

export interface EncodeOptions {
  /** When false, a function anywhere in the value is a `data` error. */
  allowFunctions: boolean;
  /** Prefix for error messages, e.g. `props.items`. */
  label?: string;
  /** Replace AbortSignals with markers (call arguments). Otherwise they are a `data` error. */
  allowSignals?: boolean;
}

export function isAbortSignal(x: unknown): x is AbortSignal {
  return typeof AbortSignal !== "undefined" && x instanceof AbortSignal;
}

export function encode(value: unknown, options: EncodeOptions): Encoded {
  const fns: Path[] = [];
  const signals: Path[] = [];
  const seen = new Map<object, unknown>();
  const label = options.label ?? "value";

  const fail = (path: PathKey[], what: string): never => {
    throw new RemoteComponentError(
      "data",
      `${what} at ${formatPath(label, path)} cannot be sent to the other side of the remote component boundary`,
      {
        data: { path: [...path] },
      },
    );
  };

  const walk = (x: unknown, path: PathKey[]): unknown => {
    switch (typeof x) {
      case "function":
        if (!options.allowFunctions) fail(path, "A function");
        fns.push([...path]);
        return null;
      case "symbol":
        return fail(path, "A symbol");
      case "object":
        break;
      default:
        return x; // string, number, boolean, bigint, undefined
    }
    if (x === null) return null;
    if (isAbortSignal(x)) {
      if (!options.allowSignals) return fail(path, "An AbortSignal");
      signals.push([...path]);
      return null;
    }
    const prior = seen.get(x);
    if (prior !== undefined) return prior;

    if (Array.isArray(x)) {
      const out: unknown[] = new Array(x.length);
      seen.set(x, out);
      for (let i = 0; i < x.length; i++) {
        path.push(i);
        out[i] = walk(x[i], path);
        path.pop();
      }
      return out;
    }
    if (isPlainObject(x)) return copyObject(x, path);

    const kind = classify(x);
    if (kind === "clone") {
      seen.set(x, x);
      return x;
    }
    if (kind === "collection") {
      seen.set(x, x);
      checkCollection(x as Map<unknown, unknown> | Set<unknown>, path);
      return x;
    }
    if (kind === "reject") return fail(path, `A ${describe(x)}`);
    // Other class instance: copy own enumerable string keys, drop prototype.
    return copyObject(x as Record<string, unknown>, path);
  };

  const copyObject = (x: object, path: PathKey[]): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    seen.set(x, out);
    for (const key of Object.keys(x)) {
      path.push(key);
      defineValue(out, key, walk((x as Record<string, unknown>)[key], path));
      path.pop();
    }
    return out;
  };

  const checkCollection = (
    c: Map<unknown, unknown> | Set<unknown>,
    path: PathKey[],
  ): void => {
    const check = (item: unknown, slot: string): void => {
      if (typeof item === "function")
        fail(
          path,
          `A function inside a ${c instanceof Map ? "Map" : "Set"} ${slot}`,
        );
      if (typeof item === "symbol")
        fail(
          path,
          `A symbol inside a ${c instanceof Map ? "Map" : "Set"} ${slot}`,
        );
      if (item !== null && typeof item === "object" && !seen.has(item)) {
        // Encode nested values only to validate them; structured clone copies the original.
        const nested = encode(item, {
          allowFunctions: false,
          label: formatPath(label, path),
        });
        void nested;
      }
    };
    if (c instanceof Map) {
      for (const [k, v] of c) {
        check(k, "key");
        check(v, "value");
      }
    } else {
      for (const v of c) check(v, "value");
    }
  };

  const v = walk(value, []);
  return {
    v,
    ...(fns.length > 0 ? { f: fns } : {}),
    ...(signals.length > 0 ? { s: signals } : {}),
  };
}

/**
 * Restores functions into a received (already structured-cloned) value by
 * mutating it in place. `makeFunction(path)` returns the proxy for a path.
 */
export function decode(
  enc: Encoded,
  makeFunction: (path: Path) => (...args: unknown[]) => unknown,
  makeSignal?: (path: Path) => AbortSignal,
): unknown {
  const places: [Path, () => unknown][] = [
    ...(enc.f ?? []).map((p): [Path, () => unknown] => [
      p,
      () => makeFunction(p),
    ]),
    ...(makeSignal === undefined
      ? []
      : (enc.s ?? []).map((p): [Path, () => unknown] => [
          p,
          () => makeSignal(p),
        ])),
  ];
  if (places.length === 0) return enc.v;
  let root = enc.v;
  for (const [path, make] of places) {
    const fn = make();
    if (path.length === 0) {
      root = fn;
      continue;
    }
    let parent: unknown = root;
    for (let i = 0; i < path.length - 1; i++) {
      // Own properties only: a path must never reach a prototype.
      if (
        parent === null ||
        typeof parent !== "object" ||
        !Object.prototype.hasOwnProperty.call(parent, path[i] as PathKey)
      ) {
        throw new RemoteComponentError(
          "protocol",
          `Invalid function path ${JSON.stringify(path)}`,
        );
      }
      parent = (parent as Record<PathKey, unknown>)[path[i] as PathKey];
      if (parent === null || typeof parent !== "object") {
        throw new RemoteComponentError(
          "protocol",
          `Invalid function path ${JSON.stringify(path)}`,
        );
      }
    }
    if (parent === null || typeof parent !== "object") {
      throw new RemoteComponentError(
        "protocol",
        `Invalid function path ${JSON.stringify(path)}`,
      );
    }
    defineValue(
      parent as Record<PathKey, unknown>,
      path[path.length - 1] as PathKey,
      fn,
    );
  }
  return root;
}

/** Reads the value at `path` in `root`, or `undefined` if any step is missing. */
export function getAtPath(root: unknown, path: Path): unknown {
  let cur = root;
  for (const key of path) {
    if (cur === null || (typeof cur !== "object" && typeof cur !== "function"))
      return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
    cur = (cur as Record<PathKey, unknown>)[key];
  }
  return cur;
}

/** Assigns without ever invoking the `__proto__` setter. */
function defineValue(
  obj: Record<PathKey, unknown>,
  key: PathKey,
  value: unknown,
): void {
  if (key === "__proto__") {
    Object.defineProperty(obj, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } else {
    obj[key] = value;
  }
}

export function isPlainObject(x: unknown): x is Record<string, unknown> {
  if (x === null || typeof x !== "object") return false;
  const proto: unknown = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

type Kind = "clone" | "collection" | "reject" | "object";

function classify(x: object): Kind {
  if (x instanceof Map || x instanceof Set) return "collection";
  if (
    x instanceof Date ||
    x instanceof RegExp ||
    x instanceof Error ||
    x instanceof ArrayBuffer ||
    ArrayBuffer.isView(x) ||
    x instanceof Boolean ||
    x instanceof Number ||
    x instanceof String ||
    (typeof BigInt === "function" &&
      Object.prototype.toString.call(x) === "[object BigInt]") ||
    (typeof Blob !== "undefined" && x instanceof Blob)
  ) {
    return "clone";
  }
  if (
    x instanceof Promise ||
    x instanceof WeakMap ||
    x instanceof WeakSet ||
    (typeof WeakRef !== "undefined" && x instanceof WeakRef) ||
    (typeof Node !== "undefined" && x instanceof Node) ||
    (typeof Window !== "undefined" && x instanceof Window) ||
    (typeof x === "object" &&
      "then" in x &&
      typeof (x as { then: unknown }).then === "function")
  ) {
    return "reject";
  }
  return "object";
}

function describe(x: object): string {
  if (
    x instanceof Promise ||
    ("then" in x && typeof (x as { then: unknown }).then === "function")
  )
    return "Promise";
  return Object.prototype.toString.call(x).slice(8, -1);
}

export function formatPath(label: string, path: readonly PathKey[]): string {
  let s = label;
  for (const k of path) {
    s +=
      typeof k === "number"
        ? `[${k}]`
        : /^[A-Za-z_$][\w$]*$/.test(k)
          ? `.${k}`
          : `[${JSON.stringify(k)}]`;
  }
  return s;
}

/**
 * Structural equality for encoded values, used to diff props so that only
 * changed top-level keys are sent. Handles cycles, Date, RegExp, Map, Set,
 * typed arrays and ArrayBuffers. Errors and Blobs compare by reference.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return eq(a, b, new Map());
}

function eq(a: unknown, b: unknown, visited: Map<object, object>): boolean {
  if (Object.is(a, b)) return true;
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  )
    return false;
  if (visited.get(a) === b) return true;
  visited.set(a, b);

  const protoA: unknown = Object.getPrototypeOf(a);
  if (protoA !== Object.getPrototypeOf(b)) return false;

  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++)
      if (!eq(a[i], bb[i], visited)) return false;
    return true;
  }
  if (a instanceof Date) return Object.is(a.getTime(), (b as Date).getTime());
  if (a instanceof RegExp)
    return a.source === (b as RegExp).source && a.flags === (b as RegExp).flags;
  if (a instanceof Map) {
    const bm = b as Map<unknown, unknown>;
    if (a.size !== bm.size) return false;
    const ea = [...a.entries()];
    const eb = [...bm.entries()];
    for (let i = 0; i < ea.length; i++) {
      const [ka, va] = ea[i] as [unknown, unknown];
      const [kb, vb] = eb[i] as [unknown, unknown];
      if (!eq(ka, kb, visited) || !eq(va, vb, visited)) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    const sb = [...(b as Set<unknown>)];
    const sa = [...a];
    if (sa.length !== sb.length) return false;
    for (let i = 0; i < sa.length; i++)
      if (!eq(sa[i], sb[i], visited)) return false;
    return true;
  }
  if (a instanceof ArrayBuffer)
    return bytesEqual(new Uint8Array(a), new Uint8Array(b as ArrayBuffer));
  if (ArrayBuffer.isView(a)) {
    const bv = b as ArrayBufferView;
    return bytesEqual(
      new Uint8Array(a.buffer, a.byteOffset, a.byteLength),
      new Uint8Array(bv.buffer, bv.byteOffset, bv.byteLength),
    );
  }
  if (a instanceof Number || a instanceof String || a instanceof Boolean) {
    return Object.is(a.valueOf(), (b as { valueOf(): unknown }).valueOf());
  }
  if (protoA !== Object.prototype && protoA !== null) return false; // Error, Blob, …: identity only

  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (
      !eq(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        visited,
      )
    )
      return false;
  }
  return true;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function encodedEqual(a: Encoded, b: Encoded): boolean {
  return deepEqual(a.v, b.v) && deepEqual(a.f ?? [], b.f ?? []);
}

/** Per-key encoded props. */
export type EncodedProps = Record<string, Encoded>;

/** Function paths in `enc`, as a set of `JSON.stringify(path)` keys (prefixed by `base`). */
export function functionPathSet(enc: Encoded, base: Path = []): Set<string> {
  return new Set((enc.f ?? []).map((p) => JSON.stringify([...base, ...p])));
}

/** Function paths in per-key encoded props (`[key, ...path]`), as `JSON.stringify` keys. */
export function propsFunctionPathSet(props: EncodedProps): Set<string> {
  const out = new Set<string>();
  for (const key of Object.keys(props))
    for (const p of props[key]!.f ?? []) out.add(JSON.stringify([key, ...p]));
  return out;
}

export interface PropsPatch {
  set: EncodedProps;
  del: string[];
}

/**
 * Encodes `next` and diffs it against the previously sent encoding. Returns
 * the new encoding (to keep for the next diff) and a patch, or `null` if
 * nothing changed. Keys are compared structurally, so a new object literal
 * with the same content does not cause a send.
 *
 * A key whose value cannot be encoded is reported through `onError` and
 * treated as absent (so the remote sees it deleted rather than stale).
 */
export function diffProps(
  prev: EncodedProps | null,
  next: Record<string, unknown>,
  onError?: (key: string, error: unknown) => void,
): { encoded: EncodedProps; patch: PropsPatch | null } {
  const encoded: EncodedProps = {};
  const set: EncodedProps = {};
  const del: string[] = [];
  for (const key of Object.keys(next)) {
    let enc: Encoded;
    try {
      enc = encode(next[key], { allowFunctions: true, label: `props.${key}` });
    } catch (err) {
      if (onError === undefined) throw err;
      onError(key, err);
      continue;
    }
    defineValue(encoded, key, enc);
    const old =
      prev !== null && Object.prototype.hasOwnProperty.call(prev, key)
        ? prev[key]
        : undefined;
    if (old === undefined || !encodedEqual(old, enc))
      defineValue(set, key, enc);
  }
  if (prev !== null) {
    for (const key of Object.keys(prev))
      if (!Object.prototype.hasOwnProperty.call(encoded, key)) del.push(key);
  }
  const changed = Object.keys(set).length > 0 || del.length > 0;
  return { encoded, patch: changed ? { set, del } : null };
}
