import debug from "debug";
import { transform, TransformErrors } from "./transform";
import { TransformOptions } from "./transform-options";
import { SingleBar, Presets } from "cli-progress";

const bundle = ["v0-8/ui-package-split"];

const log = debug("codemod:upgrade");
const error = debug("codemod:upgrade:error");

export function upgrade(options: TransformOptions) {
  const cwd = process.cwd();
  log("Starting upgrade...");
  const modCount = bundle.length;
  const bar = new SingleBar(
    {
      format: "Progress |{bar}| {percentage}% | ETA: {eta}s || {codemod}",
      hideCursor: true,
    },
    Presets.shades_classic,
  );
  bar.start(modCount, 0, { codemod: "Starting..." });
  const allErrors: TransformErrors = [];
  for (const codemod of bundle) {
    const errors = transform(codemod, cwd, options, { logStatus: false });
    allErrors.push(...errors);
    bar.increment(1, { codemod });
  }
  bar.stop();

  if (allErrors.length > 0) {
    log("Some codemods did not apply successfully to all files. Details:");
    allErrors.forEach(({ transform, filename, summary }) => {
      error(`codemod=${transform}, path=${filename}, summary=${summary}`);
    });
  }

  log("Upgrade complete.");
}
