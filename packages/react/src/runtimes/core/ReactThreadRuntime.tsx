import type { ComponentType } from "react";
import type { ThreadRuntime } from "./ThreadRuntime";

export type ReactThreadRuntime = ThreadRuntime & {
  unstable_synchronizer?: ComponentType;
};
