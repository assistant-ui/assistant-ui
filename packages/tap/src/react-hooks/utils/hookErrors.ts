export const throwRenderedMoreHooks = (): never => {
  throw new Error(
    "Rendered more hooks than during the previous render. " +
      "Hooks must be called in the exact same order in every render.",
  );
};

export const throwHookOrderChanged = (): never => {
  throw new Error("Hook order changed between renders");
};
