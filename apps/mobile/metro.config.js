// Expo's own defaults, with one addition: Metro has to treat `.riv` files as
// assets, otherwise `require('…/companion-cat.riv')` fails to resolve and the
// bundle never builds. Everything else is left exactly as Expo sets it up.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('riv')) {
  config.resolver.assetExts.push('riv');
}

module.exports = config;
