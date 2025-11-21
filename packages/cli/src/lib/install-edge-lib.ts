import { installPackageIfNeeded } from "./utils/package-installer";

export default async function installEdgeLib(): Promise<void> {
  await installPackageIfNeeded({
    packageName: "@assistant-ui/react-ai-sdk",
    importPatterns: [
      "@assistant-ui/react-edge",
      "@assistant-ui/react-ai-sdk",
      "useChatRuntime",
    ],
    promptMessage:
      "Edge Runtime imports were detected but @assistant-ui/react-ai-sdk is not installed. Do you want to install it? (Y/n) ",
    skipMessage:
      "@assistant-ui/react-ai-sdk is already installed. Skipping installation.",
    notFoundMessage: "No Edge Runtime imports found; skipping installation.",
  });
}
