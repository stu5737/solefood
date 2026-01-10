module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NativeWind 插件已暫時移除，因為當前組件使用純 StyleSheet
    // 如果需要使用 NativeWind，請按照 NativeWind v4 文檔正確配置
    plugins: [],
  };
};
