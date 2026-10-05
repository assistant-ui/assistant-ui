import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

export const useIsServerRender = () =>
  useSyncExternalStore(
    subscribeNever,
    () => false,
    () => typeof document === "undefined",
  );
