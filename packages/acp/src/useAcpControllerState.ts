"use client";

import { useSyncExternalStore } from "react";
import type { AcpThreadController } from "./AcpThreadController";
import type { AcpThreadState } from "./acpThreadState";

export const useAcpControllerState = (
  controller: Pick<AcpThreadController, "getState" | "subscribe">,
): AcpThreadState =>
  useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
