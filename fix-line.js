const fs = require("fs");
const path =
  "D:/assistant-ui/packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.ts";
let content = fs.readFileSync(path, "utf8");

// Replace the broken peel guard line
content = content.replace(
  "// peel guard: any shared key left in chatOptions collapses this to \never",
  "// peel guard: any shared key left in chatOptions collapses this to never",
);

fs.writeFileSync(path, content, "utf8");
console.log("Fixed!");
