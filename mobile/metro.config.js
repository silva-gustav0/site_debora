// Metro com acesso às regras compartilhadas com o site: "@shared/*" (tsconfig paths) → ../src/lib.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../src/lib")];

module.exports = config;
