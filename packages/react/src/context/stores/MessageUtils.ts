import { create } from "zustand";

export type MessageUtilsState = Readonly<{
  inProgressIndicator: HTMLSpanElement;
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;
}>;

export const makeMessageUtilsStore = () =>
  create<MessageUtilsState>((set) => ({
    inProgressIndicator: document.createElement("span"),
    isCopied: false,
    setIsCopied: (value) => {
      set({ isCopied: value });
    },
    isHovering: false,
    setIsHovering: (value) => {
      set({ isHovering: value });
    },
  }));
