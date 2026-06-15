import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { createDocsTools } from "./tools/docs-tools";
import { createSourceMapTools } from "./tools/source-map-tools";
import { createTemplateTools } from "./tools/template-tools";

export function createXuluxChatTools({
  clientTools,
  routeUrl,
}: {
  clientTools: Parameters<typeof frontendTools>[0];
  routeUrl: string;
}) {
  return {
    ...frontendTools(clientTools),
    ...createSourceMapTools(),
    ...createDocsTools({ routeUrl }),
    ...createTemplateTools(),
  };
}
