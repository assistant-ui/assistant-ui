import type { ExtractResourceReturnType, ResourceElement } from "../core/types";
import {
  attachResourceFiberToParent,
  disposeResourceFiber,
  scheduleResourceFiberDisposal,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { hasContextDepsChanged } from "../core/context";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useInsertionEffect, useMemo, useRef } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";
import { peekResourceFiber } from "../core/helpers/execution-context";
import { addCommit } from "../core/helpers/root";

export function useResource<E extends ResourceElement<any>>(
  element: E,
): ExtractResourceReturnType<E> {
  const parentFiber = peekResourceFiber();
  const { version, createFiber } = useResourceFiberHost();
  const fiber = useMemo(() => {
    return createFiber(element.hook, element.key);
  }, [element.hook, element.key, createFiber]);

  const result = useRenderMemo(
    () => ({ value: renderResourceFiber(fiber, element.args) }),
    [fiber, version, element.args],
    hasContextDepsChanged(fiber),
  );

  if (parentFiber === null) {
    // The React-hosted or Tap-hosted execution path is invariant.
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    useInsertionEffect(
      () => () => scheduleResourceFiberDisposal(fiber),
      [fiber],
    );
  }

  const committedFiberRef = useRef<typeof fiber | null>(null);
  const committedFiber = committedFiberRef.current;
  if (
    parentFiber !== null &&
    committedFiber !== null &&
    committedFiber !== fiber
  ) {
    addCommit(parentFiber, () => scheduleResourceFiberDisposal(committedFiber));
  }

  useEffect(() => {
    committedFiberRef.current = fiber;
  }, [fiber]);

  useEffect(() => {
    if (parentFiber !== null) attachResourceFiberToParent(fiber, parentFiber);
    return () => {
      if (fiber.isDisposePending || parentFiber?.isDisposing) {
        disposeResourceFiber(fiber);
      } else unmountResourceFiber(fiber);
    };
  }, [fiber, parentFiber]);
  useEffect(() => {
    void result;
    commitResourceFiber(fiber);
  }, [fiber, result]);

  return result.value;
}
