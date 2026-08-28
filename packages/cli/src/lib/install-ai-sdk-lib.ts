import { installPackageIfNeeded } from "./utils/package-installer";

export default async function installAiSdkLib(): Promise<void> {
  await installPackageIfNeeded({
    packageName: "@assistant-ui/ai-sdk",
    importPatterns: ["@assistant-ui/ai-sdk"],
    promptMessage:
      "AI SDK imports were added but @assistant-ui/ai-sdk is not installed. Do you want to install it? (Y/n) ",
    skipMessage:
      "@assistant-ui/ai-sdk is already installed. Skipping installation.",
    notFoundMessage: "No AI SDK imports found; skipping installation.",
  });

  // The previous name is a separate package, so an import of it needs that
  // package installed; the neutral one would not make it resolvable.
  await installPackageIfNeeded({
    packageName: "@assistant-ui/react-ai-sdk",
    importPatterns: ["@assistant-ui/react-ai-sdk"],
    promptMessage:
      "AI SDK imports were added but @assistant-ui/react-ai-sdk is not installed. Do you want to install it? (Y/n) ",
    skipMessage:
      "@assistant-ui/react-ai-sdk is already installed. Skipping installation.",
    notFoundMessage: "No legacy AI SDK imports found; skipping installation.",
  });
}
