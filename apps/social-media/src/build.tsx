import { readdir } from "node:fs/promises";
import { renderCard } from "./render";

const LAUNCHES_DIR = new URL("./launches", import.meta.url).pathname;

async function main() {
  const files = await readdir(LAUNCHES_DIR);
  const launchFiles = files.filter(
    (f) => f.endsWith(".tsx") && !f.startsWith("_"),
  );

  if (launchFiles.length === 0) {
    console.log("No launch files found in src/launches/");
    return;
  }

  for (const file of launchFiles) {
    const name = file.replace(/\.tsx$/, "");
    const mod = await import(`./launches/${file}`);
    const Component = mod.default;

    if (!Component) {
      console.warn(`Skipping ${file}: no default export`);
      continue;
    }

    await renderCard(name, <Component />);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
