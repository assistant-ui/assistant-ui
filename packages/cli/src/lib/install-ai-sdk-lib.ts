import { installPackageIfNeeded } from "./utils/package-installer";

export default async function installAiSdkLib(): Promise<void> {
  await installPackageIfNeeded({
    packageName: "@assistant-ui/ai-sdk",
    importPatterns: ["@assistant-ui/ai-sdk", "@assistant-ui/react-ai-sdk"],
    satisfiedBy: ["@assistant-ui/ai-sdk", "@assistant-ui/react-ai-sdk"],
    promptMessage:
      "AI SDK imports were added but @assistant-ui/ai-sdk is not installed. Do you want to install it? (Y/n) ",
    skipMessage:
      "The AI SDK integration is already installed. Skipping installation.",
    notFoundMessage: "No AI SDK imports found; skipping installation.",
  });
}
