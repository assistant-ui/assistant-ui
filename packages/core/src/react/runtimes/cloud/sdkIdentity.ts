import type { SdkIdentity } from "assistant-cloud";

export const CORE_SDK: SdkIdentity = {
  name: "@assistant-ui/core",
  version:
    typeof __AUI_PACKAGE_VERSION__ === "string"
      ? __AUI_PACKAGE_VERSION__
      : "0.0.0",
};
