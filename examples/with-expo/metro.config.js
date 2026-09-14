const { getDefaultConfig } = require("expo/metro-config");
const { withAui } = require("@assistant-ui/metro");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// Enable symlinks support for pnpm
config.resolver.unstable_enableSymlinks = true;

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Kit sources under packages/ui import react-native, uniwind and native modules
// that must resolve to the app's single copy, so every bare specifier is tried
// from the app root before falling back to the importing file's location.
const isBareSpecifier = (moduleName) =>
  !moduleName.startsWith(".") && !path.isAbsolute(moduleName);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isBareSpecifier(moduleName)) {
    try {
      return context.resolveRequest(
        {
          ...context,
          originModulePath: path.resolve(projectRoot, "package.json"),
        },
        moduleName,
        platform,
      );
    } catch {}
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(withAui(config), {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});
