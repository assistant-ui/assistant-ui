import * as React from "react";
import {
  renderGenerativeUITree,
  type ChildKeyMemory,
} from "./renderGenerativeUI";
import type { GenerativeUILibrary, GenerativeUIRenderContext } from "./types";

type CommittedKeys = {
  committed: ChildKeyMemory["committed"];
  keyed: ReadonlyMap<string, string>;
};

const NO_KEYS: CommittedKeys = { committed: new Map(), keyed: new Map() };

/** Renders a tree that streams into one mounted renderer, so a child whose `$key` arrives after its `$type` keeps its React key and its state. */
export function GenerativeUITree({
  node,
  library,
  context,
}: {
  node: unknown;
  library: GenerativeUILibrary;
  context: GenerativeUIRenderContext;
}) {
  const last = React.useRef(NO_KEYS);
  const keys: ChildKeyMemory = {
    committed: last.current.committed,
    keyed: new Map(last.current.keyed),
    rendered: new Map(),
  };
  React.useInsertionEffect(() => {
    last.current = { committed: keys.rendered, keyed: keys.keyed };
  });
  return renderGenerativeUITree(node, library, context, keys);
}
