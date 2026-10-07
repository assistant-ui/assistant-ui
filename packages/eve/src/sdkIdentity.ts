import type { SdkIdentity } from "assistant-cloud";

export const EVE_SDK: SdkIdentity = {
  name: "@assistant-ui/eve",
  version:
    typeof __AUI_PACKAGE_VERSION__ === "string"
      ? __AUI_PACKAGE_VERSION__
      : "0.0.0",
};
