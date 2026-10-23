import * as React from "react";
import { GenerativeUITree } from "../GenerativeUITree";
import type {
  GenerativeUIDispatch,
  GenerativeUILibrary,
  GenerativeUIStatus,
} from "../types";
import { A2uiBindingContext } from "../bindingContext";
import { equalData } from "../equalData";
import { reconcileDataModel, resolvePointer } from "./dataModel";
import { applyA2uiOperations, setAtPointer } from "./reducer";
import { createLiveSurfaceConverter } from "./convert";

export function A2uiPresentRenderer({
  surfaceId,
  operations,
  fallback,
  library,
  status,
  dispatch,
  imageOrigins,
}: {
  surfaceId: string;
  operations: unknown;
  fallback: unknown;
  library: GenerativeUILibrary;
  status: GenerativeUIStatus;
  dispatch?: GenerativeUIDispatch;
  imageOrigins?: readonly string[];
}) {
  const surface = React.useMemo(
    () => applyA2uiOperations(new Map(), operations).state.get(surfaceId),
    [operations, surfaceId],
  );
  const incoming = surface?.dataModel;
  const [local, setLocal] = React.useState(() => ({
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
  const convert = React.useMemo(
    () => surface && createLiveSurfaceConverter(surface),
    [surface],
  );
  const converted = React.useMemo(
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
      <GenerativeUITree
        node={converted?.spec ?? fallback}
        library={library}
        context={{
          status,
          ...(dispatch ? { dispatch } : {}),
          ...(imageOrigins !== undefined ? { imageOrigins } : {}),
        }}
      />
    </BindingContext.Provider>
  );
}
