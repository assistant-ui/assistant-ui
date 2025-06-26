import debug from "debug";
import { transform, TransformErrors, getRelevantFiles } from "./transform";
import { TransformOptions } from "./transform-options";
import { SingleBar, Presets } from "cli-progress";
import installReactUILib from "./install-ui-lib";
import installEdgeLib from "./install-edge-lib";
import installAiSdkLib from "./install-ai-sdk-lib";

const bundle = [
  "v0-8/ui-package-split",
  "v0-9/edge-package-split",
  "v0-11/content-part-to-message-part",
];

const log = debug("codemod:upgrade");
const error = debug("codemod:upgrade:error");

/**
 * Runs the upgrade cycle:
 *   - Runs each codemod in the bundle.
 *   - Displays progress using cli-progress.
 *   - After codemods run, checks if any file now imports from the new packages and prompts for install.
 */
export async function upgrade(options: TransformOptions) {
  const cwd = process.cwd();
  log("Starting upgrade...");

  // Find relevant files once to avoid duplicate work
  console.log("Analyzing codebase...");
  const relevantFiles = getRelevantFiles(cwd);
  const fileCount = relevantFiles.length;
  console.log(`Found ${fileCount} files to process.`);

  // Calculate total work units (files × codemods)
  const totalWork = fileCount * bundle.length;
  let completedWork = 0;

  const bar = new SingleBar(
    {
      format: "Progress |{bar}| {percentage}% | ETA: {eta}s || {status}",
      hideCursor: true,
    },
    Presets.shades_classic,
  );

  bar.start(totalWork, 0, { status: "Starting..." });
  const allErrors: TransformErrors = [];

  for (const codemod of bundle) {
    bar.update(completedWork, { status: `Running ${codemod}...` });

    // Use a custom progress callback to update the progress bar
    const errors = transform(codemod, cwd, options, {
      logStatus: false,
      onProgress: (processedFiles: number) => {
        completedWork = bundle.indexOf(codemod) * fileCount + processedFiles;
        bar.update(Math.min(completedWork, totalWork), {
          status: `Running ${codemod} (${processedFiles}/${fileCount} files)`,
        });
      },
      relevantFiles, // Pass the pre-computed relevant files
    });

    allErrors.push(...errors);
    completedWork = (bundle.indexOf(codemod) + 1) * fileCount;
    bar.update(completedWork, { status: `Completed ${codemod}` });
  }

  bar.update(totalWork, { status: "Checking dependencies..." });
  bar.stop();

  if (allErrors.length > 0) {
    log("Some codemods did not apply successfully to all files. Details:");
    allErrors.forEach(({ transform, filename, summary }) => {
      error(`codemod=${transform}, path=${filename}, summary=${summary}`);
    });
  }

  // After codemods run, check if files import from the new packages and prompt for install.
  console.log("Checking for package dependencies...");
  await installReactUILib();
  await installEdgeLib();
  await installAiSdkLib();

  log("Upgrade complete.");
  console.log("✅ Upgrade complete!");
}
