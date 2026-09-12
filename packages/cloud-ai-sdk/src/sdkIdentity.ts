import type { SdkIdentity } from "assistant-cloud";

export const CLOUD_AI_SDK_SDK: SdkIdentity = {
  name: "@assistant-ui/cloud-ai-sdk",
  version:
    typeof __AUI_PACKAGE_VERSION__ === "string"
      ? __AUI_PACKAGE_VERSION__
      : "0.0.0",
};
