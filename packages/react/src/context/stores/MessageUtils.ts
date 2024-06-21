import type { ReactNode } from "react";
import { create } from "zustand";

export type MessageUtilsState = Readonly<{
  inProgressIndicator: ReactNode | null;
  setInProgressIndicator: (value: ReactNode | null) => void;
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;
}>;

export const makeMessageUtilsStore = () =>
  create<MessageUtilsState>((set) => ({
    inProgressIndicator: null,
    setInProgressIndicator: (value) => {
      set({ inProgressIndicator: value });
    },
    isCopied: false,
    setIsCopied: (value) => {
      set({ isCopied: value });
    },
    isHovering: false,
    setIsHovering: (value) => {
      set({ isHovering: value });
    },
  }));
