const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

// Find the project and workspace root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Enable symlinks support for pnpm
config.resolver.unstable_enableSymlinks = true;

// 3. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 4. Force resolving shared dependencies from app's node_modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force react, react-native, and react/jsx-runtime to resolve from the app
  if (
    moduleName === "react" ||
    moduleName === "react-native" ||
    moduleName.startsWith("react/") ||
    moduleName.startsWith("react-native/")
  ) {
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

module.exports = config;
