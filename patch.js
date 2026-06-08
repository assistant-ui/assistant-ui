const fs = require("fs");
const path =
  "D:/assistant-ui/packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  'adapters?: AISDKRuntimeAdapter["adapters"] | undefined;',
  'adapters?: (AISDKRuntimeAdapter["adapters"] & { threadList?: import("@assistant-ui/core").RemoteThreadListAdapter }) | undefined;',
);

content = content.replace(
  "const cloudAdapter = useCloudThreadListAdapter({ cloud });",
  "const cloudAdapter = useCloudThreadListAdapter({ cloud });\n  const adapter = options.adapters?.threadList ?? cloudAdapter;",
);

content = content.replace("adapter: cloudAdapter,", "adapter,");

fs.writeFileSync(path, content);
