"use client";

import { useEffect, useRef } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useA2ui } from "@assistant-ui/react-a2ui";

type DismissResult = { dismissed: string };

export const DismissToolUI = makeAssistantToolUI<
  { surfaceId: string },
  DismissResult
>({
  toolName: "dismiss_surface",
  render: ({ result }) => {
    const { processMessage } = useA2ui();
    const dismissed = useRef(false);

    useEffect(() => {
      if (!result || dismissed.current) return;
      dismissed.current = true;
      processMessage({ type: "deleteSurface", surfaceId: result.dismissed });
    }, [result, processMessage]);

    return null;
  },
});
