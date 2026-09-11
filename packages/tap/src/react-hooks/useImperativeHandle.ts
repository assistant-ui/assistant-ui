import { useEffect } from "./useEffect";

type ImperativeRef<T> =
  | ((instance: T | null) => void | (() => void))
  | { current: T | null }
  | null
  | undefined;

export const useImperativeHandle = <T>(
  ref: ImperativeRef<T>,
  create: () => T,
  deps?: readonly unknown[] | null,
): void => {
  const attach = () => {
    if (!ref) return undefined;
    const value = create();
    if (typeof ref === "function") {
      const dispose = ref(value);
      return typeof dispose === "function" ? dispose : () => ref(null);
    }
    ref.current = value;
    return () => {
      ref.current = null;
    };
  };
  // React appends the ref to the dependency array, so a replaced ref
  // re-assigns even when the caller deps are unchanged. A caller's deps arity
  // is static, so the branch is render-stable.
  if (deps == null) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    useEffect(attach);
  } else {
    // oxlint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps
    useEffect(attach, [...deps, ref]);
  }
};
