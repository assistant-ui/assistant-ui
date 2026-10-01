"use client";

import { useAui } from "@assistant-ui/react";
import { MODELS } from "@/lib/model";
import { XULUX_MODEL_ID } from "@/lib/xulux/usage-budget-codes";
import { useEffect, type ReactNode } from "react";

export function XuluxModelInfo(): ReactNode {
  const aui = useAui();
  const modelName =
    MODELS.find((model) => model.value === XULUX_MODEL_ID)?.name ??
    XULUX_MODEL_ID;

  useEffect(() => {
    return aui.modelContext.register({
      getModelContext: () => ({
        config: {
          modelName: XULUX_MODEL_ID,
        },
      }),
    });
  }, [aui]);

  return (
    <span className="text-muted-foreground px-2 py-1 text-xs">{modelName}</span>
  );
}
