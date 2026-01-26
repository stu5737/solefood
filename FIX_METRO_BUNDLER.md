# 修复 "No script URL provided" 错误

## 错误信息
```
No script URL provided. Make sure the packager is running or you have embedded a JS bundle in your application bundle.
```

## 原因
这个错误通常发生在：
1. Metro bundler 没有运行
2. 应用无法连接到 Metro bundler（网络/IP 问题）
3. 使用了 `expo run:ios` 但没有启动 Metro bundler
4. 缓存问题

## 解决方案

### 方案 1：确保 Metro bundler 正在运行（推荐）

**步骤：**

1. **在一个终端启动 Metro bundler：**
   ```bash
   npx expo start
   ```
   
   你应该看到类似这样的输出：
   ```
   Metro waiting on exp://192.168.x.x:8081
   ```

2. **在另一个终端运行 iOS 应用：**
   ```bash
   npx expo run:ios
   ```

   或者，如果 Metro bundler 已经在运行，直接在模拟器中按 `r` 重新加载。

### 方案 2：使用 Expo Go（最简单）

如果你使用 Expo Go，只需要：

```bash
npx expo start
# 然后在设备/模拟器上扫描二维码或按 'i' 打开 iOS 模拟器
```

### 方案 3：清理并重新启动

如果上述方法无效，尝试完全清理：

```bash
# 1. 停止所有进程（Ctrl+C）

# 2. 清理缓存
npx expo start --clear

# 3. 如果使用原生构建，清理 iOS
cd ios
rm -rf build
cd ..

# 4. 重新启动
npx expo start
# 然后在另一个终端：npx expo run:ios
```

### 方案 4：检查网络配置

如果使用物理设备或在不同网络：

1. **确保设备/模拟器与电脑在同一网络**
2. **检查防火墙设置**
3. **使用 `--tunnel` 模式（如果网络有问题）：**
   ```bash
   npx expo start --tunnel
   ```

### 方案 5：使用本地 bundle（离线模式）

如果网络问题持续，可以构建离线 bundle：

```bash
# 构建生产 bundle
npx expo export

# 然后运行原生应用
npx expo run:ios
```

## 常见问题排查

### Q: 我运行了 `expo run:ios`，但 Metro bundler 没有自动启动？
A: `expo run:ios` 会尝试启动 Metro，但有时会失败。手动启动更可靠：
```bash
# 终端 1
npx expo start

# 终端 2
npx expo run:ios
```

### Q: 模拟器显示 "Unable to connect to Metro"？
A: 检查：
1. Metro bundler 是否在运行
2. 端口 8081 是否被占用：`lsof -i :8081`
3. 尝试重启 Metro：`npx expo start --clear`

### Q: 物理设备无法连接？
A: 
1. 确保设备和电脑在同一 Wi-Fi 网络
2. 使用 `npx expo start --tunnel`（需要 Expo 账号）
3. 或者使用 USB 连接并启用端口转发

## 推荐工作流

**开发时（推荐）：**
```bash
# 终端 1：启动 Metro
npx expo start

# 终端 2：运行 iOS（如果需要原生功能）
npx expo run:ios
```

**快速测试（使用 Expo Go）：**
```bash
npx expo start
# 然后按 'i' 打开 iOS 模拟器，或扫描二维码
```
