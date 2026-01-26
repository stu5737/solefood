#!/bin/bash
# Android SDK 环境变量快速设置脚本

echo "🔧 设置 Android SDK 环境变量..."
echo ""

# 检查 .zshrc 是否存在
ZSHRC_FILE="$HOME/.zshrc"
BACKUP_FILE="$HOME/.zshrc.backup.$(date +%Y%m%d_%H%M%S)"

# 备份现有配置
if [ -f "$ZSHRC_FILE" ]; then
    echo "📋 备份现有 .zshrc 到: $BACKUP_FILE"
    cp "$ZSHRC_FILE" "$BACKUP_FILE"
fi

# 检查是否已存在 Android 配置
if grep -q "ANDROID_HOME" "$ZSHRC_FILE" 2>/dev/null; then
    echo "⚠️  检测到已有 Android 配置"
    echo ""
    read -p "是否要更新现有配置？(y/n): " update
    if [ "$update" != "y" ]; then
        echo "❌ 已取消"
        exit 0
    fi
    # 移除旧的 Android 配置
    sed -i.bak '/# Android SDK/,/export PATH=\$PATH:\$ANDROID_HOME\/tools\/bin/d' "$ZSHRC_FILE" 2>/dev/null || true
fi

# 添加 Android SDK 配置
echo "" >> "$ZSHRC_FILE"
echo "# Android SDK" >> "$ZSHRC_FILE"
echo "export ANDROID_HOME=\$HOME/Library/Android/sdk" >> "$ZSHRC_FILE"
echo "export PATH=\$PATH:\$ANDROID_HOME/emulator" >> "$ZSHRC_FILE"
echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools" >> "$ZSHRC_FILE"
echo "export PATH=\$PATH:\$ANDROID_HOME/tools" >> "$ZSHRC_FILE"
echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin" >> "$ZSHRC_FILE"

echo "✅ 已添加 Android SDK 配置到 ~/.zshrc"
echo ""
echo "📋 下一步："
echo "1. 确保已安装 Android Studio"
echo "2. 确保 Android SDK 已安装在: ~/Library/Android/sdk"
echo "3. 运行以下命令应用配置："
echo "   source ~/.zshrc"
echo ""
echo "4. 验证安装："
echo "   ./scripts/check-android-sdk.sh"
echo ""
