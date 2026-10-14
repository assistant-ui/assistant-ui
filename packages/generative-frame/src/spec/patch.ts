import { deepEqual } from "../json-schema";
import {
  getAtPointer,
  parsePointer,
  writeAtPointer,
  type WriteOptions,
} from "./pointer";
import type { PatchOperation } from "./types";

const OPS = new Set(["add", "replace", "remove", "move", "copy", "test"]);

/** Narrows an unknown value to a patch operation, or explains why it is not one. */
export function checkPatchOperation(
  value: unknown,
): { ok: true; op: PatchOperation } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "a patch operation must be a JSON object" };
  }
  const op = value as Record<string, unknown>;
  if (typeof op["op"] !== "string" || !OPS.has(op["op"])) {
    return {
      ok: false,
      error: `"op" must be one of ${[...OPS].join(", ")}`,
    };
  }
  if (typeof op["path"] !== "string") {
    return { ok: false, error: '"path" must be a string' };
  }
  if (
    (op["op"] === "move" || op["op"] === "copy") &&
    typeof op["from"] !== "string"
  ) {
    return { ok: false, error: `"${op["op"]}" needs a string "from"` };
  }
  if (
    (op["op"] === "add" || op["op"] === "replace" || op["op"] === "test") &&
    !("value" in op)
  ) {
    return { ok: false, error: `"${op["op"]}" needs a "value"` };
  }
  return { ok: true, op: op as PatchOperation };
}

const clone = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);

/**
 * Applies one RFC 6902 operation and returns the new document; the input is
 * not mutated and unchanged branches are shared. Throws when the operation
 * cannot apply. With `createMissing`, `add` and `replace` create missing
 * parent objects, which streaming relies on for paths like `/state/a/b`.
 */
export function applyPatchOperation<T>(
  doc: T,
  operation: PatchOperation,
  options: WriteOptions = {},
): T {
  const path = parsePointer(operation.path);
  switch (operation.op) {
    case "add":
      return writeAtPointer(doc, path, "add", operation.value, options) as T;
    case "replace":
      return writeAtPointer(
        doc,
        path,
        "replace",
        operation.value,
        options,
      ) as T;
    case "remove":
      return writeAtPointer(doc, path, "remove") as T;
    case "move": {
      const from = parsePointer(operation.from);
      if (
        from.length < path.length &&
        from.every((token, index) => path[index] === token)
      ) {
        throw new Error("Cannot move a value into one of its own children");
      }
      const value = getAtPointer(doc, from);
      if (value === undefined) {
        throw new Error(`Nothing to move at "${operation.from}"`);
      }
      const removed = writeAtPointer(doc, from, "remove");
      return writeAtPointer(removed, path, "add", value, options) as T;
    }
    case "copy": {
      const value = getAtPointer(doc, operation.from);
      if (value === undefined) {
        throw new Error(`Nothing to copy at "${operation.from}"`);
      }
      return writeAtPointer(doc, path, "add", clone(value), options) as T;
    }
    case "test":
      if (!deepEqual(getAtPointer(doc, path), operation.value)) {
        throw new Error(`Test failed at "${operation.path}"`);
      }
      return doc;
  }
}

/** Applies operations in order; throws on the first one that fails. */
export function applyPatch<T>(
  doc: T,
  operations: readonly PatchOperation[],
  options: WriteOptions = {},
): T {
  return operations.reduce(
    (current, operation) => applyPatchOperation(current, operation, options),
    doc,
  );
}
