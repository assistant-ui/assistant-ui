"use client";

import { useSyncExternalStore } from "react";
import type { AcpThreadControllerLike } from "./AcpThreadController";
import type { AcpThreadState } from "./acpThreadState";

export const useAcpControllerState = (
  controller: AcpThreadControllerLike,
): AcpThreadState =>
  useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
