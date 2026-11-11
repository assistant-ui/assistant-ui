import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { liteDemoModule, loadLiteDemo, writeLiteDemos } from "./lite-demos";

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

it("aliases each demo to a placeholder until it is loaded", () => {
  root = mkdtempSync(join(tmpdir(), "lite-demos-"));
  const aliases = writeLiteDemos(root);
  expect(aliases["@/components/pages/home/demo"]).toBe(
    "./.source/lite-demos/home.tsx",
  );
  const home = () => readFileSync(join(root, liteDemoModule("home")), "utf8");
  expect(home()).toContain("LiteDemoPlaceholder");
  expect(home()).toContain("export const HomeDemo = Placeholder;");

  loadLiteDemo(root, "home");
  expect(home()).toBe(
    'export { HomeDemo } from "../../components/pages/home/demo/index.tsx";\n',
  );
  expect(
    readFileSync(join(root, liteDemoModule("playground")), "utf8"),
  ).toContain("export default Placeholder;");

  // A restart keeps the demos that were loaded.
  writeLiteDemos(root);
  expect(home()).not.toContain("LiteDemoPlaceholder");
});
