import { installPackageIfNeeded } from "./utils/package-installer";

export default async function installAiSdkLib(): Promise<void> {
  await installPackageIfNeeded({
    packageName: "@assistant-ui/react-ai-sdk",
    importPatterns: ["@assistant-ui/react-ai-sdk"],
    promptMessage:
      "AI SDK imports were added but @assistant-ui/react-ai-sdk is not installed. Do you want to install it? (Y/n) ",
    skipMessage:
      "@assistant-ui/react-ai-sdk is already installed. Skipping installation.",
    notFoundMessage: "No AI SDK imports found; skipping installation.",
  });
}
