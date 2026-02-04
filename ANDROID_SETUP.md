# Android 开发环境设置指南

## 快速设置（推荐）

### 选项 1：使用 Expo Go（最简单，无需 Android SDK）

```bash
# 启动开发服务器
npx expo start

# 然后在 Android 设备上：
# 1. 安装 Expo Go app
# 2. 扫描二维码即可运行
```

**优点：**
- 无需安装 Android Studio
- 无需配置 Android SDK
- 立即可用

**限制：**
- 某些原生功能可能受限
- 无法测试完整的原生构建

---

### 选项 2：完整 Android 开发环境（用于原生构建）

#### 步骤 1：安装 Android Studio

1. 下载：https://developer.android.com/studio
2. 安装并打开 Android Studio
3. 完成初始设置向导

#### 步骤 2：设置环境变量

在 `~/.zshrc` 文件中添加：

```bash
# Android SDK
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

#### 步骤 2.5：让 Android Studio 能找到 Node（使用 nvm/fnm 时必做）

Android Studio 不会加载 `~/.zshrc`，所以 Gradle 和 Expo 插件会报错：**A problem occurred starting process 'command 'node''**。

在终端执行（只需做一次）：

```bash
./scripts/ensure-node-on-path.sh
```

按提示输入密码后，`node` 会链接到 `/usr/local/bin/node`，Android Studio 即可找到。然后重新在 Android Studio 中 **Sync Project with Gradle Files**。

#### 步骤 3：验证安装

```bash
# 检查 adb 是否可用
adb version

# 检查 Android SDK 路径
echo $ANDROID_HOME
```

#### 步骤 4：运行 Android 应用

```bash
# 预构建（如果还没做）
npx expo prebuild --platform android

# 运行
npx expo run:android
```

---

## 同时开发两个平台

### 方法 1：使用 Expo Go（推荐）

**终端 1 - iOS：**
```bash
npx expo run:ios
```

**终端 2 - Android（使用 Expo Go）：**
```bash
npx expo start
# 然后在 Android 设备上扫描二维码
```

### 方法 2：两个原生构建（需要完整 Android SDK）

**终端 1 - iOS：**
```bash
npx expo run:ios
```

**终端 2 - Android：**
```bash
npx expo run:android
```

---

## 常见问题

### Q: `ANDROID_HOME` 找不到？
A: 确保 Android Studio 已安装，SDK 路径通常是 `~/Library/Android/sdk`

### Q: `adb` 命令找不到？
A: 确保 `platform-tools` 在 PATH 中

### Q: 想快速测试，不想安装 Android Studio？
A: 使用 Expo Go，在 Android 设备上安装 Expo Go app 即可

### Q: 报错 "A problem occurred starting process 'command ''node''" 或 "Failed to apply plugin 'expo-autolinking-settings'"？
A: 使用 nvm/fnm 时，Android Studio 的 PATH 里没有 node。在终端执行一次：`./scripts/ensure-node-on-path.sh`（会要求输入密码），然后重新 Sync Gradle。
