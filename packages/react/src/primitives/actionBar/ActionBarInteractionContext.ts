"use client";

import { createContext, useContext } from "react";

export type ActionBarInteractionContextValue = {
  acquireInteractionLock: () => () => void;
};

export const ActionBarInteractionContext =
  createContext<ActionBarInteractionContextValue | null>(null);

export const useActionBarInteractionContext = () =>
  useContext(ActionBarInteractionContext);
