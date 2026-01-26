#!/bin/bash
# 修复 react-native-reanimated Worklets 版本不匹配

echo "🔧 修复 react-native-reanimated Worklets 版本不匹配..."
echo ""

# 1. 清理 iOS Pods
echo "📦 清理 iOS Pods..."
cd ios 2>/dev/null && rm -rf Pods Podfile.lock && pod deintegrate && cd .. || echo "⚠️  iOS 目录不存在，跳过"

# 2. 清理 Xcode DerivedData
echo "🧹 清理 Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 3. 清理 Metro 缓存
echo "🗑️  清理 Metro 缓存..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null

# 4. 重新安装 Pods（如果 iOS 存在）
if [ -d "ios" ]; then
  echo "📦 重新安装 Pods..."
  cd ios
  pod install
  cd ..
fi

echo ""
echo "✅ 清理完成！"
echo ""
echo "下一步："
echo "1. 停止当前开发服务器（Ctrl+C）"
echo "2. 运行: npx expo start --clear"
echo "3. 或者运行: npx expo run:ios --no-build-cache"
