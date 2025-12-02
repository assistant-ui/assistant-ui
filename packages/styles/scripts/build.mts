import { Build } from "@assistant-ui/x-buildutils";
import { execSync } from "node:child_process";

// Run sync-styles first to generate index.css from registry
console.log("Running sync-styles...");
execSync("tsx scripts/sync-styles.mts", { stdio: "inherit" });

await Build.start().transpileCSS({
  cssEntrypoints: ["src/styles/index.css"],
});
