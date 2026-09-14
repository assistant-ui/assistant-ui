const { getDefaultConfig } = require("expo/metro-config");
const { withAui } = require("@assistant-ui/metro");
const { withUniwindConfig } = require("uniwind/metro");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

if (fs.existsSync(path.join(monorepoRoot, "pnpm-workspace.yaml"))) {
  const kitRoot = path.join(monorepoRoot, "packages", "ui");

  config.watchFolders = [monorepoRoot];
  config.resolver.unstable_enableSymlinks = true;
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
  ];

  // Workspace packages carry their own react-native, and the kit sources under
  // packages/ui import react-native, uniwind and the Expo modules from there,
  // so those imports resolve from the app root to keep a single copy of each.
  const isBareSpecifier = (moduleName) =>
    !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
  const resolvesFromAppRoot = (context, moduleName) =>
    moduleName === "react" ||
    moduleName === "react-native" ||
    moduleName.startsWith("react/") ||
    moduleName.startsWith("react-native/") ||
    (isBareSpecifier(moduleName) &&
      context.originModulePath.startsWith(kitRoot));

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (resolvesFromAppRoot(context, moduleName)) {
      return context.resolveRequest(
        {
          ...context,
          originModulePath: path.resolve(projectRoot, "package.json"),
        },
        moduleName,
        platform,
      );
    }

    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = withUniwindConfig(withAui(config), {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});
