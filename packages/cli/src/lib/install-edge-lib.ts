import { scanForImport } from "./utils/file-scanner";
import {
  isPackageInstalled,
  askQuestion,
  installPackage,
} from "./utils/package-manager";

export default async function installEdgeLib(): Promise<void> {
  // Check for both old and new import patterns
  const found = scanForImport([
    "@assistant-ui/react-edge",
    "@assistant-ui/react-ai-sdk",
  ]);

  // Also check for the specific useChatRuntime pattern
  const hasUseChatRuntime =
    found || scanForImport(["useChatRuntime", "@assistant-ui/react-ai-sdk"]);

  if (!hasUseChatRuntime) {
    console.log("No Edge Runtime imports found; skipping installation.");
    return;
  }

  if (isPackageInstalled("@assistant-ui/react-ai-sdk")) {
    console.log(
      "@assistant-ui/react-ai-sdk is already installed. Skipping installation.",
    );
    return;
  }

  const answer = await askQuestion(
    "Edge Runtime imports were detected but @assistant-ui/react-ai-sdk is not installed. Do you want to install it? (Y/n) ",
  );

  if (answer === "" || answer.toLowerCase().startsWith("y")) {
    await installPackage("@assistant-ui/react-ai-sdk");
  } else {
    console.log("Skipping installation.");
  }
}
