"use client";

import { useSyncExternalStore } from "react";
import type {
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
} from "./types";

export const useOpenCodeControllerState = (
  controller: OpenCodeThreadControllerLike,
): OpenCodeThreadState => {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
};
