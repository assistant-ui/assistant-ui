import type { Action } from "../ir";
import type { GenerativeUIDispatch } from "../types";

export const actionAttr = (a: Action | undefined): string | undefined =>
  a ? JSON.stringify(a) : undefined;

/**
 * Fires `$action` through `$dispatch` when both are present, merging a runtime value into the payload under the reserved `$input` key (not `value`) so the user's input never clobbers a model-supplied `value` field. No-op when no registry is wired. The returned promise from an async handler is caught and re-thrown on a microtask so rejections surface rather than going unhandled.
 */
export const fire = (
  $action: Action | undefined,
  $dispatch: GenerativeUIDispatch | undefined,
  input?: unknown,
) => {
  if (!$action || !$dispatch) return;
  const payload = input === undefined ? $action : { ...$action, $input: input };
  void Promise.resolve($dispatch(payload)).catch((error) => {
    queueMicrotask(() => {
      throw error;
    });
  });
};
