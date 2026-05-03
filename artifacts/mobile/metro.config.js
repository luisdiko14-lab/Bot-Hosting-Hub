const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Block _tmp_* directories that Expo native module postinstall scripts create
// then delete — Metro's FallbackWatcher crashes trying to watch them.
const tmpBlockPattern = /[/\\]node_modules[/\\].+_tmp_\d+([/\\]|$)/;

const existingBlockList = config.resolver?.blockList;
if (Array.isArray(existingBlockList)) {
  config.resolver.blockList = [...existingBlockList, tmpBlockPattern];
} else if (existingBlockList instanceof RegExp) {
  config.resolver.blockList = [existingBlockList, tmpBlockPattern];
} else {
  config.resolver = { ...config.resolver, blockList: [tmpBlockPattern] };
}

module.exports = config;
