// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ⚡ PRODUCTION OPTIMIZATIONS
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: true, // Remove console.logs in production
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      passes: 3,
    },
    mangle: {
      keep_fnames: false,
      keep_classnames: false,
    },
    output: {
      comments: false,
      ascii_only: true,
    },
  },
};

// Enable Hermes for better performance
config.transformer.hermesParser = true;

// Optimize asset resolution
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'db', 'mp3', 'ttf', 'obj', 'png', 'jpg'],
  sourceExts: [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json', 'mjs', 'cjs'],
};

module.exports = config;
