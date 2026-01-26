# Android 开发问题排查指南

## 当前遇到的问题

### 1. ❌ Android SDK 路径未找到
```
Failed to resolve the Android SDK path. Default install location not found: /Users/yumingliao/Library/Android/sdk
Error: spawn adb ENOENT
```

### 2. ❌ Mapbox 原生代码未链接
```
@rnmapbox/maps native code not available. Make sure you have linked the library and rebuild your app.
```

---

## 🚀 快速解决方案

### 方案 A：使用 Expo Go（推荐，无需 Android SDK）

**优点：**
- ✅ 无需安装 Android Studio
- ✅ 无需配置 Android SDK
- ✅ 立即可用
- ✅ 适合快速开发和测试

**步骤：**

1. **在 Android 设备上安装 Expo Go**
   - Google Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **启动开发服务器**
   ```bash
   npx expo start
   ```

3. **在 Android 设备上扫描二维码**
   - 打开 Expo Go app
   - 扫描终端中显示的二维码

4. **临时切换到 react-native-maps（避免 Mapbox 错误）**
   ```bash
   # 编辑 src/config/features.ts
   # 将 MAP_ENGINE 改为 'react-native-maps'
   ```

---

### 方案 B：完整 Android 开发环境

#### 步骤 1：安装 Android Studio

1. 下载：https://developer.android.com/studio
2. 安装并打开 Android Studio
3. 完成初始设置向导（会自动下载 Android SDK）

#### 步骤 2：配置环境变量

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

#### 步骤 3：验证安装

```bash
# 检查 adb
adb version

# 检查 Android SDK 路径
echo $ANDROID_HOME
# 应该输出: /Users/yumingliao/Library/Android/sdk
```

#### 步骤 4：重新构建 Android 项目（修复 Mapbox）

```bash
# 清理并重新构建
npx expo prebuild --platform android --clean
npx expo run:android
```

---

## 🔧 临时修复：切换到 react-native-maps

如果暂时无法解决 Mapbox 问题，可以临时切换到 `react-native-maps`：

1. **编辑 `src/config/features.ts`**
   ```typescript
   export const MAP_ENGINE: 'mapbox' | 'react-native-maps' = 'react-native-maps';
   ```

2. **重启开发服务器**
   ```bash
   npx expo start
   ```

**注意：** `react-native-maps` 不支持 Mapbox 的 3D 功能和赛博庞克风格，但可以正常显示地图。

---

## 📱 同时开发两个平台

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

### 或者两个都用 Expo Go

**单个终端：**
```bash
npx expo start
# iOS 和 Android 设备都可以扫描同一个二维码
```

---

## ✅ 验证修复

### 检查 Android SDK
```bash
which adb
# 应该输出: /Users/yumingliao/Library/Android/sdk/platform-tools/adb
```

### 检查 Mapbox
```bash
# 如果使用 Mapbox，确保已设置 token
cat src/config/mapbox.ts | grep MAPBOX_ACCESS_TOKEN
```

---

## 🆘 仍然遇到问题？

1. **Android SDK 路径不同？**
   - 打开 Android Studio
   - Preferences → Appearance & Behavior → System Settings → Android SDK
   - 查看 "Android SDK Location"
   - 更新 `ANDROID_HOME` 环境变量

2. **Mapbox 仍然报错？**
   - 确保已运行 `npx expo prebuild --platform android`
   - 确保已运行 `npx expo run:android`（需要 Android SDK）
   - 或者临时切换到 `react-native-maps`

3. **需要帮助？**
   - 查看项目根目录的 `ANDROID_SETUP.md`
   - 查看 Expo 文档：https://docs.expo.dev/guides/using-expo-cli/
