import { useMemo, useState } from "react";
import { renderGenerativeUI } from "../renderGenerativeUI";
import type { Action } from "../ir";
import type {
  GenerativeUIDispatch,
  GenerativeUILibrary,
  GenerativeUIStatus,
} from "../types";
import { A2UI_BINDING_ACTION_TYPE, type A2uiState } from "./types";
import { applyA2uiOperations } from "./reducer";
import { convertSurfaceToUISpec } from "./convert";

export function A2uiPresentRenderer({
  surfaceId,
  operations,
  fallback,
  library,
  status,
  dispatch,
}: {
  surfaceId: string;
  operations: unknown;
  fallback: unknown;
  library: GenerativeUILibrary;
  status: GenerativeUIStatus;
  dispatch?: GenerativeUIDispatch;
}) {
  const incomingState = useMemo(
    () => applyA2uiOperations(new Map(), operations).state,
    [operations],
  );
  const [state, setState] = useState<A2uiState>(incomingState);
  const [previousOperations, setPreviousOperations] = useState(operations);

  if (operations !== previousOperations) {
    setPreviousOperations(operations);
    setState(incomingState);
  }

  const surface = state.get(surfaceId);
  const { spec } = surface ? convertSurfaceToUISpec(surface) : { spec: null };
  const node = spec ?? fallback;

  const dispatchWithBindings: GenerativeUIDispatch = (action: Action) => {
    if (
      action.type === A2UI_BINDING_ACTION_TYPE &&
      action["surfaceId"] === surfaceId
    ) {
      const path = action["path"];
      if (typeof path === "string" && Object.hasOwn(action, "$input")) {
        setState(
          (current) =>
            applyA2uiOperations(current, [
              {
                version: "v1.0",
                updateDataModel: {
                  surfaceId,
                  path,
                  value: action["$input"],
                },
              },
            ]).state,
        );
      }
      return;
    }

    return dispatch?.(action);
  };

  return renderGenerativeUI(node, library, {
    status,
    dispatch: dispatchWithBindings,
  });
}
