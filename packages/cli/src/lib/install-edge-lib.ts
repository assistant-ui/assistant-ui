import { installPackageIfNeeded } from "./utils/package-installer";

export default async function installEdgeLib(): Promise<void> {
  // Only the retired edge specifier is unambiguous here. `useChatRuntime` and
  // the AI SDK package specifiers are shared by both AI SDK packages, so
  // installAiSdkLib resolves those by the specifier the file actually imports.
  await installPackageIfNeeded({
    packageName: "@assistant-ui/ai-sdk",
    importPatterns: ["@assistant-ui/react-edge"],
    promptMessage:
      "Edge Runtime imports were detected but @assistant-ui/ai-sdk is not installed. Do you want to install it? (Y/n) ",
    skipMessage:
      "@assistant-ui/ai-sdk is already installed. Skipping installation.",
    notFoundMessage: "No Edge Runtime imports found; skipping installation.",
  });
}
