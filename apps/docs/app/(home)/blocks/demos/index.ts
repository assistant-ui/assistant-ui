import type { ComponentType } from "react";
import PrimitivesChat from "./primitives-chat/chat";

/** Demo blocks that live in the docs app, keyed by block slug. */
export const BLOCK_DEMOS: Readonly<Record<string, ComponentType>> = {
  "primitives-chat": PrimitivesChat,
};
