import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { createDocsTools } from "./tools/docs-tools";
import { createSandboxTools } from "./tools/sandbox-tools";
import { createSourceMapTools } from "./tools/source-map-tools";

export function createXuluxChatTools({
  clientTools,
  sessionId,
  routeUrl,
}: {
  clientTools: Parameters<typeof frontendTools>[0];
  sessionId: string | undefined;
  routeUrl: string;
}) {
  return {
    ...frontendTools(clientTools),
    ...createSourceMapTools(),
    ...createSandboxTools({ sessionId }),
    ...createDocsTools({ routeUrl }),
  };
}
