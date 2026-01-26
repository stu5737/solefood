# 安装 Android SDK（Mapbox 必需）

## 为什么需要 Android SDK？

由于你使用 **Mapbox**（需要原生代码），无法使用 Expo Go。必须安装 Android Studio 和 Android SDK 来构建原生应用。

---

## 📥 安装步骤

### 步骤 1：下载 Android Studio

1. 访问：https://developer.android.com/studio
2. 下载 macOS 版本（约 1GB）
3. 安装 `.dmg` 文件

### 步骤 2：初始设置

1. **打开 Android Studio**
2. **完成设置向导：**
   - 选择 "Standard" 安装类型
   - 等待下载 Android SDK（约 2-3GB，需要一些时间）
   - SDK 会安装在：`~/Library/Android/sdk`

### 步骤 3：配置环境变量

**编辑 `~/.zshrc` 文件：**

```bash
# 打开文件
nano ~/.zshrc
# 或
code ~/.zshrc  # 如果用 VS Code
```

**添加以下内容：**

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**保存并应用：**

```bash
source ~/.zshrc
```

### 步骤 4：验证安装

运行检查脚本：

```bash
./scripts/check-android-sdk.sh
```

或者手动检查：

```bash
# 检查环境变量
echo $ANDROID_HOME
# 应该输出: /Users/yumingliao/Library/Android/sdk

# 检查 adb
adb version
# 应该显示 adb 版本信息
```

### 步骤 5：安装 Android 模拟器（可选）

如果需要测试但没有物理设备：

1. 打开 Android Studio
2. Tools → Device Manager
3. Create Device
4. 选择一个设备（推荐 Pixel 5）
5. 下载系统镜像（推荐 API 33 或 34）

---

## 🚀 运行 Android 应用

安装完成后：

```bash
# 1. 确保 Android SDK 已配置
./scripts/check-android-sdk.sh

# 2. 预构建 Android 项目（如果还没做）
npx expo prebuild --platform android

# 3. 运行应用
npx expo run:android
```

---

## 🔧 故障排查

### Q: `ANDROID_HOME` 仍然找不到？

**检查 SDK 实际位置：**

1. 打开 Android Studio
2. Preferences → Appearance & Behavior → System Settings → Android SDK
3. 查看 "Android SDK Location"
4. 如果路径不同，更新 `~/.zshrc` 中的 `ANDROID_HOME`

### Q: `adb` 命令找不到？

确保 `platform-tools` 已安装：

1. 打开 Android Studio
2. Preferences → Appearance & Behavior → System Settings → Android SDK
3. SDK Tools 标签
4. 勾选 "Android SDK Platform-Tools"
5. Apply

### Q: 需要安装哪些 SDK 组件？

至少需要：
- ✅ Android SDK Platform-Tools
- ✅ Android SDK Build-Tools
- ✅ Android SDK Platform (API 33 或 34)

Android Studio 的 Standard 安装会自动包含这些。

---

## ⏱️ 预计时间

- 下载 Android Studio：5-10 分钟（取决于网速）
- 安装和初始设置：10-15 分钟
- SDK 下载：10-30 分钟（取决于网速和选择的组件）
- **总计：约 30-60 分钟**

---

## 💡 提示

1. **首次安装需要时间**：SDK 下载可能需要一些时间，请耐心等待
2. **磁盘空间**：确保至少有 10GB 可用空间
3. **网络**：需要稳定的网络连接下载 SDK
4. **完成后**：运行 `./scripts/check-android-sdk.sh` 验证配置

---

## ✅ 验证清单

安装完成后，运行：

```bash
./scripts/check-android-sdk.sh
```

应该看到：
- ✅ ANDROID_HOME 已设置
- ✅ Android SDK 目录存在
- ✅ adb 已安装

然后就可以运行：

```bash
npx expo run:android
```
