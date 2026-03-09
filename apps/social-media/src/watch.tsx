import { watch } from "node:fs";
import { readdir } from "node:fs/promises";
import { renderCard } from "./render";

const LAUNCHES_DIR = new URL("./launches", import.meta.url).pathname;

async function buildAll() {
  const files = await readdir(LAUNCHES_DIR);
  const launchFiles = files.filter(
    (f) => f.endsWith(".tsx") && !f.startsWith("_"),
  );

  if (launchFiles.length === 0) {
    console.log("No launch files found in src/launches/");
    return;
  }

  for (const file of launchFiles) {
    await buildFile(file);
  }
}

async function buildFile(file: string) {
  const name = file.replace(/\.tsx$/, "");
  // bust module cache with query param
  const mod = await import(`./launches/${file}?t=${Date.now()}`);
  const Component = mod.default;

  if (!Component) {
    console.warn(`Skipping ${file}: no default export`);
    return;
  }

  await renderCard(name, <Component />);
}

// Initial build
await buildAll();
console.log(`\nWatching ${LAUNCHES_DIR} for changes...\n`);

// Watch for changes
let debounce: ReturnType<typeof setTimeout> | null = null;
watch(LAUNCHES_DIR, { recursive: true }, (_event, filename) => {
  if (!filename?.endsWith(".tsx")) return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(async () => {
    console.log(`\nRebuilding ${filename}...`);
    try {
      await buildFile(filename);
    } catch (err) {
      console.error(`Error building ${filename}:`, err);
    }
  }, 100);
});
