// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ✅ 添加 GLB/GLTF 3D 模型文件支持
config.resolver.assetExts.push(
  'glb',  // 3D 模型 (Binary glTF)
  'gltf', // 3D 模型 (Text glTF)
  'bin'   // glTF binary data
);

module.exports = config;
