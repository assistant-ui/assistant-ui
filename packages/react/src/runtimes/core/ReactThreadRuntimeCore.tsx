import type { ComponentType } from "react";
import type { ThreadRuntimeCore } from "./ThreadRuntimeCore";

export type ReactThreadRuntimeCore = ThreadRuntimeCore & {
  unstable_synchronizer?: ComponentType;
};
