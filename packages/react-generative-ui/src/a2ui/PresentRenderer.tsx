import { useMemo, useState } from "react";
import { renderGenerativeUI } from "../renderGenerativeUI";
import type {
  GenerativeUIDispatch,
  GenerativeUILibrary,
  GenerativeUIStatus,
} from "../types";
import { A2uiBindingContext } from "./BindingContext";
import { equalData, reconcileDataModel, resolvePointer } from "./dataModel";
import { applyA2uiOperations, setAtPointer } from "./reducer";
import { createLiveSurfaceConverter } from "./convert";

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
  const surface = useMemo(
    () => applyA2uiOperations(new Map(), operations).state.get(surfaceId),
    [operations, surfaceId],
  );
  const incoming = surface?.dataModel;
  const [local, setLocal] = useState(() => ({
    incoming,
    value: incoming,
    editedPaths: new Set<string>(),
  }));
  const model = Object.is(incoming, local.incoming)
    ? local
    : reconcileDataModel(
        local.incoming,
        incoming,
        local.value,
        local.editedPaths,
      );
  if (model !== local) setLocal(model);
  const convert = useMemo(
    () => surface && createLiveSurfaceConverter(surface),
    [surface],
  );
  const converted = useMemo(
    () => convert?.(model.value),
    [convert, model.value],
  );
  const BindingContext = A2uiBindingContext!;
  return (
    <BindingContext.Provider
      value={
        converted
          ? {
              fields: converted.bindings,
              update: (path, value) =>
                setLocal((current) =>
                  equalData(resolvePointer(current.value, path), value)
                    ? current
                    : {
                        ...current,
                        value: setAtPointer(current.value, path, value, false)
                          .value,
                        editedPaths: new Set([...current.editedPaths, path]),
                      },
                ),
            }
          : undefined
      }
    >
      {renderGenerativeUI(converted?.spec ?? fallback, library, {
        status,
        ...(dispatch ? { dispatch } : {}),
      })}
    </BindingContext.Provider>
  );
}
