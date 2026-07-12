import { frontendTools, type FrontendTools } from "@assistant-ui/react-ai-sdk";
import { createDocsTools } from "./tools/docs-tools";
import { createSourceMapTools } from "./tools/source-map-tools";
import { createTemplateTools } from "./tools/template-tools";

export function createXuluxChatTools({
  clientTools,
  routeUrl,
}: {
  clientTools: FrontendTools;
  routeUrl: string;
}) {
  return {
    ...frontendTools(clientTools),
    ...createSourceMapTools(),
    ...createDocsTools({ routeUrl }),
    ...createTemplateTools(),
  };
}
