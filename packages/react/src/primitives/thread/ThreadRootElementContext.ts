"use client";

import { createContext, type RefObject, useContext } from "react";

export const ThreadRootElementContext = createContext<
  RefObject<HTMLElement | null> | undefined
>(undefined);

export const useThreadRootElementRef = () =>
  useContext(ThreadRootElementContext);
