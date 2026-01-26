#!/bin/bash

# Android Development Build 構建腳本
# 用途：構建 Development Build APK 並可選安裝到連接的設備

set -e

echo "🚀 開始構建 Android Development Build..."

# 檢查是否在項目根目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在項目根目錄運行此腳本"
    exit 1
fi

# 檢查 Android 目錄是否存在
if [ ! -d "android" ]; then
    echo "📦 Android 目錄不存在，正在執行 prebuild..."
    npx expo prebuild --platform android
fi

# 檢查 adb 是否可用
if ! command -v adb &> /dev/null; then
    echo "⚠️  警告：adb 未找到，將只構建 APK，不會自動安裝"
    INSTALL_APK=false
else
    # 檢查是否有連接的設備
    DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
    if [ "$DEVICES" -eq 0 ]; then
        echo "⚠️  警告：未檢測到連接的 Android 設備"
        echo "   將只構建 APK，不會自動安裝"
        INSTALL_APK=false
    else
        echo "✅ 檢測到 $DEVICES 個 Android 設備"
        INSTALL_APK=true
    fi
fi

# 進入 android 目錄構建
echo "🔨 正在構建 APK..."
cd android
./gradlew assembleDebug

# 檢查構建是否成功
if [ $? -eq 0 ]; then
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    
    echo ""
    echo "✅ 構建成功！"
    echo "📦 APK 位置: android/$APK_PATH"
    echo "📊 APK 大小: $APK_SIZE"
    echo ""
    
    # 如果設備已連接，詢問是否安裝
    if [ "$INSTALL_APK" = true ]; then
        read -p "是否要安裝到連接的設備？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📱 正在安裝到設備..."
            adb install -r "$APK_PATH"
            if [ $? -eq 0 ]; then
                echo "✅ 安裝成功！"
                read -p "是否要啟動 app？(y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    adb shell am start -n com.solefood.mvp/.MainActivity
                    echo "🚀 App 已啟動！"
                fi
            else
                echo "❌ 安裝失敗"
            fi
        fi
    else
        echo "💡 提示：要安裝 APK，請："
        echo "   1. 將 APK 傳輸到手機"
        echo "   2. 在手機上點擊 APK 文件安裝"
        echo "   或使用: adb install android/$APK_PATH"
    fi
else
    echo "❌ 構建失敗"
    exit 1
fi

cd ..
