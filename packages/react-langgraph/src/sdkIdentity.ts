import type { SdkIdentity } from "assistant-cloud";

export const LANGGRAPH_SDK: SdkIdentity = {
  name: "@assistant-ui/react-langgraph",
  version:
    typeof __AUI_PACKAGE_VERSION__ === "string"
      ? __AUI_PACKAGE_VERSION__
      : "0.0.0",
};
