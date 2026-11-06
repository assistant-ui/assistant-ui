import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPiHttpClient,
  type PiLoadState,
  type PiRunStatus,
} from "@assistant-ui/react-pi";
import { toPiModelOptions, type PiModelOption } from "./pi-model-catalog";

type UsePiModelCatalogInput = {
  enabled: boolean;
  threadId: string;
  loadState: PiLoadState;
  runStatus: PiRunStatus;
  handshakeModels: PiModelOption[];
  selectedModelId?: string | undefined;
  selectedModel?: PiModelOption | undefined;
};

export const usePiModelCatalog = ({
  enabled,
  threadId,
  loadState,
  runStatus,
  handshakeModels,
  selectedModelId,
  selectedModel,
}: UsePiModelCatalogInput): PiModelOption[] => {
  const [threadCatalog, setThreadCatalog] = useState<{
    threadId: string;
    models: PiModelOption[];
  } | null>(null);
  const knownModels = useRef(new Map<string, PiModelOption>());
  const client = useMemo(() => createPiHttpClient(), []);
  const hasLoadedThread = enabled && loadState === "loaded";

  useEffect(() => {
    for (const model of handshakeModels) {
      knownModels.current.set(model.id, model);
    }
  }, [handshakeModels]);

  useEffect(() => {
    if (!hasLoadedThread) return;

    let current = true;
    void client
      .getAvailableModels({ threadId })
      .then((catalog) => {
        if (!current) return;
        const models = toPiModelOptions(catalog);
        for (const model of models) {
          knownModels.current.set(model.id, model);
        }
        setThreadCatalog({ threadId, models });
      })
      .catch(() => {
        if (current)
          setThreadCatalog({ threadId, models: [...handshakeModels] });
      });

    return () => {
      current = false;
    };
  }, [
    client,
    enabled,
    handshakeModels,
    hasLoadedThread,
    loadState,
    runStatus,
    selectedModelId,
    threadId,
  ]);

  const catalogModels =
    hasLoadedThread && threadCatalog?.threadId === threadId
      ? threadCatalog.models
      : handshakeModels;
  const retainedModel = selectedModelId
    ? (knownModels.current.get(selectedModelId) ??
      (selectedModel?.id === selectedModelId ? selectedModel : undefined))
    : undefined;

  return retainedModel &&
    !catalogModels.some((model) => model.id === retainedModel.id)
    ? [...catalogModels, retainedModel]
    : catalogModels;
};
