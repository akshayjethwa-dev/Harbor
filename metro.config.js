// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// --- Firebase + Metro fix ---------------------------------------------------
// Firebase's modular SDK relies on CommonJS `.cjs` files and the legacy
// (non "package exports") resolution path. Without these two lines, Metro
// resolves `firebase/auth` incorrectly and you get the runtime error:
//   "Component auth has not been registered yet"
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}
config.resolver.unstable_enablePackageExports = false;
// ---------------------------------------------------------------------------

// Keep your existing custom resolver (web stub for react-native-maps).
// NOTE: capture the *post-flag* resolver so the fallback uses the legacy path.
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Web: redirect react-native-maps to the stub file.
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/lib/react-native-maps.web.js'),
    };
  }

  // Fallback to default resolution.
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;