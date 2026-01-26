# Android 快速开始指南

## 🚀 立即开始（无需安装 Android SDK）

### 使用 Expo Go（推荐，5 分钟搞定）

**步骤：**

1. **在 Android 设备上安装 Expo Go**
   - Google Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent
   - 或搜索 "Expo Go"

2. **启动开发服务器**
   ```bash
   npx expo start
   ```

3. **连接设备**
   - 确保 Android 设备与电脑在同一 Wi-Fi 网络
   - 在 Expo Go app 中扫描终端显示的二维码
   - 或者输入终端显示的 URL

4. **开始开发！**
   - 修改代码后，应用会自动热重载
   - 按 `r` 重新加载，按 `m` 打开开发者菜单

**优点：**
- ✅ 无需安装 Android Studio（节省 5GB+ 空间）
- ✅ 无需配置 Android SDK
- ✅ 立即可用
- ✅ 支持热重载和调试

**限制：**
- ⚠️ 某些原生模块可能受限（但你的项目应该没问题）
- ⚠️ 无法测试完整的原生构建流程

---

## 📱 同时开发 iOS 和 Android

### 推荐工作流

**终端 1 - iOS（原生构建）：**
```bash
npx expo run:ios
```

**终端 2 - Android（Expo Go）：**
```bash
npx expo start
# 然后在 Android 设备上扫描二维码
```

**或者两个都用 Expo Go：**
```bash
# 单个终端
npx expo start
# iOS 和 Android 设备都可以扫描同一个二维码
```

---

## 🔧 如果需要完整 Android 原生构建

如果你需要测试完整的原生构建（例如发布到 Google Play），则需要安装 Android Studio。

### 快速安装步骤

1. **下载 Android Studio**
   - https://developer.android.com/studio
   - 文件大小约 1GB，安装后约 5GB

2. **安装并配置**
   - 打开 Android Studio
   - 完成初始设置向导（会自动下载 Android SDK）
   - SDK 通常安装在 `~/Library/Android/sdk`

3. **配置环境变量**

   编辑 `~/.zshrc`：
   ```bash
   # 添加以下内容
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

   然后执行：
   ```bash
   source ~/.zshrc
   ```

4. **验证安装**
   ```bash
   ./scripts/check-android-sdk.sh
   ```

5. **运行 Android 应用**
   ```bash
   npx expo run:android
   ```

---

## 🆘 故障排查

### 检查 Android SDK 配置
```bash
./scripts/check-android-sdk.sh
```

### 常见问题

**Q: 我想快速测试，不想安装 Android Studio？**
A: 使用 Expo Go，完全不需要 Android SDK！

**Q: Expo Go 支持我需要的所有功能吗？**
A: 对于大多数开发场景，Expo Go 完全够用。只有在需要测试完整原生构建时才需要 Android Studio。

**Q: 我已经安装了 Android Studio，但 `adb` 找不到？**
A: 运行 `./scripts/check-android-sdk.sh` 检查配置，确保环境变量已设置。

---

## 📚 更多信息

- 详细设置指南：`ANDROID_SETUP.md`
- 故障排查：`TROUBLESHOOTING_ANDROID.md`
