const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve files from the shared packages/ directory.
config.watchFolders = [path.resolve(workspaceRoot, "packages")];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  "@tweak/theme": path.resolve(workspaceRoot, "packages/theme/src"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
