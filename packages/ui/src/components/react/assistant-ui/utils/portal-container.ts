"use client";

import { createContext } from "react";

export const PortalContainerContext = createContext<
  HTMLElement | ShadowRoot | null | undefined
>(undefined);
