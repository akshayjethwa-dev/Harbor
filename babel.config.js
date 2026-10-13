module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Note: `expo-router/babel` was merged into `babel-preset-expo`
    // starting in SDK 50. It no longer needs to be listed as a plugin.
    plugins: [],
  };
};