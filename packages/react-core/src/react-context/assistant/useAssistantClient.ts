import { useResource } from "@assistant-ui/tap/react";
import { AssistantClient } from "../../client/AssistantClient";

export const useAssistantClient = (
  config: AssistantClient.Config
): AssistantClient => {
  return useResource(AssistantClient(config));
};
