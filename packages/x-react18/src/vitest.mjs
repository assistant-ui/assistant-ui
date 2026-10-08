import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { react18Specifier } from "./resolve.mjs";

const requireReact18 = createRequire(
  new URL("../package.json", import.meta.url),
);

export function react18({ root = process.cwd() } = {}) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const dependsOnTap = ["dependencies", "peerDependencies"].some(
    (field) => pkg[field]?.["@assistant-ui/tap"],
  );
  // aui-build rewrites `react` to tap's react-shim only in the code a tap-based package emits, so only the package's own modules get the shim; its dependencies keep plain React 18.
  // tap itself is left out: its tests run its src, and resolving @assistant-ui/tap/react-shim from there would load the built dist, a second copy of tap's runtime.
  const ownRoot = `${realpathSync(root).split(sep).join("/")}/`;
  const remapsToShim =
    dependsOnTap && pkg.name !== "@assistant-ui/tap"
      ? (importer) =>
          importer.startsWith(ownRoot) && !importer.includes("/node_modules/")
      : () => false;

  return {
    plugins: [
      {
        name: "aui-react18",
        enforce: "pre",
        resolveId(source, importer) {
          const target = react18Specifier(source);
          if (!target) return null;
          if (source === "react" && importer && remapsToShim(importer)) {
            return this.resolve("@assistant-ui/tap/react-shim", importer, {
              skipSelf: true,
            });
          }
          return requireReact18.resolve(target);
        },
      },
    ],
    test: {
      execArgv: [
        "--import",
        fileURLToPath(new URL("./hooks.mjs", import.meta.url)),
      ],
    },
  };
}
