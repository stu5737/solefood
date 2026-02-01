#!/bin/bash

# GPX 设置验证脚本

echo "🔍 验证 GPX 文件配置..."
echo ""

# 检查 GPX 文件是否存在
if [ -f "SolefoodMVP/Chishang_10min_Loop.gpx" ]; then
    echo "✅ GPX 文件存在: SolefoodMVP/Chishang_10min_Loop.gpx"
else
    echo "❌ GPX 文件不存在: SolefoodMVP/Chishang_10min_Loop.gpx"
    exit 1
fi

# 检查项目文件是否包含 GPX 引用
if grep -q "Chishang_10min_Loop.gpx" "SolefoodMVP.xcodeproj/project.pbxproj"; then
    echo "✅ GPX 文件已添加到 Xcode 项目"
else
    echo "❌ GPX 文件未在 Xcode 项目中找到"
    exit 1
fi

# 检查 Scheme 文件是否包含位置配置
if grep -q "Chishang 10min Loop" "SolefoodMVP.xcodeproj/xcshareddata/xcschemes/SolefoodMVP.xcscheme"; then
    echo "✅ GPX 文件已配置为默认位置模拟"
else
    echo "⚠️  GPX 文件可能未在 Scheme 中配置"
fi

echo ""
echo "✅ 配置验证完成！"
echo ""
echo "📝 下一步："
echo "   运行: npx expo run:ios"
echo "   应用启动后，iOS 模拟器会自动使用 GPX 轨迹模拟位置"
