import {
  createStructuredStream,
  type IncrementalJsonScanner,
} from "streamfold";
import {
  parsePartialJsonObject,
  withPartialJsonObjectMeta,
} from "../../utils/json/parse-partial-json-object";
import type { ReadonlyJSONObject } from "../../utils/json/json-value";

export class ToolCallArgsParser {
  private scanner: IncrementalJsonScanner | undefined;
  private offset = 0;
  private partialPath: (string | number)[] = [];
  private fallback = false;

  read(text: string): ReadonlyJSONObject | undefined {
    if (this.fallback || text.length === 0) return parsePartialJsonObject(text);

    try {
      this.scanner ??= createStructuredStream({ snapshots: "immutable" });
      const update = this.scanner.push(text.slice(this.offset));
      this.offset = text.length;
      for (const change of update.changes) {
        // Preserve secure-json-parse's rejection of prototype-bearing payloads.
        if (
          change.path.some(
            (key, index, path) =>
              key === "__proto__" ||
              (key === "prototype" && path[index - 1] === "constructor"),
          )
        )
          throw new Error(
            "Prototype-bearing arguments require legacy validation",
          );
        this.partialPath = [...change.path];
      }
      while (
        this.partialPath.length > 0 &&
        this.scanner.getFieldState(this.partialPath) === "complete"
      ) {
        this.partialPath.pop();
      }
      const value = update.partialValue;
      if (value === null || typeof value !== "object") return undefined;
      return withPartialJsonObjectMeta(value as ReadonlyJSONObject, {
        state: update.complete ? "complete" : "partial",
        partialPath: this.partialPath.map(String),
      });
    } catch {
      this.fallback = true;
      this.dispose();
      return parsePartialJsonObject(text);
    }
  }

  dispose(): void {
    this.scanner?.dispose();
    this.scanner = undefined;
  }
}
