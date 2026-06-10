const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'wasm' to asset extensions so expo-sqlite works on web
config.resolver.assetExts.push('wasm');

module.exports = config;
