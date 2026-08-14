import { useEffect } from "./useEffect";

type ImperativeRef<T> =
  | ((instance: T | null) => void)
  | { current: T | null }
  | null
  | undefined;

export const useImperativeHandle = <T>(
  ref: ImperativeRef<T>,
  create: () => T,
  deps?: readonly unknown[],
): void => {
  const attach = () => {
    if (!ref) return undefined;
    const value = create();
    if (typeof ref === "function") {
      ref(value);
      return () => ref(null);
    }
    ref.current = value;
    return () => {
      ref.current = null;
    };
  };
  // React appends the ref to the dependency array, so a replaced ref
  // re-assigns even when the caller deps are unchanged. A caller's deps arity
  // is static, so the branch is render-stable.
  if (deps === undefined) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    useEffect(attach);
  } else {
    // oxlint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps
    useEffect(attach, [...deps, ref]);
  }
};
