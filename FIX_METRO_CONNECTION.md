# 🔧 修复 Metro 连接错误 (Connection refused 8081)

## 错误信息

```
Could not connect to the server.
http://localhost:8081/status
Connection refused (61)
No script URL provided. Make sure the packager is running or you have embedded a JS bundle.
```

## 原因

**Metro 打包器没有运行。** 应用启动时会连接 `localhost:8081` 获取 JavaScript 包，如果 Metro 没启动就会报错。

---

## ✅ 正确启动流程（2 个终端）

### 终端 1：先启动 Metro

```bash
cd /Users/yumingliao/YML/solefoodmvp
npm start
```

或使用 dev client：

```bash
npm run start:dev
```

**保持这个终端运行**，直到看到类似：

```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

### 终端 2：再运行应用

等 Metro 启动完成后，**新开一个终端**：

```bash
cd /Users/yumingliao/YML/solefoodmvp
npx expo run:ios
```

或在 **Xcode** 中按 `⌘R` 运行。

---

## 📋 完整步骤（推荐）

### 步骤 1：启动 Metro（第一个终端）

```bash
cd /Users/yumingliao/YML/solefoodmvp
npm start
```

**等待**直到看到 "Metro waiting on..." 或 QR code。

### 步骤 2：运行 iOS 应用（第二个终端）

**新开一个终端窗口**：

```bash
cd /Users/yumingliao/YML/solefoodmvp
npx expo run:ios
```

或打开 Xcode 后按 `⌘R`。

### 步骤 3：确认连接

应用启动后应能正常加载，不再出现 "Connection refused"。

---

## 🚨 如果仍然连接失败

### 检查 1：端口是否被占用

```bash
lsof -i :8081
```

如果有其他进程占用 8081，可以：

- 关掉占用端口的进程，或
- 换端口启动：`npx expo start --port 8082`

### 检查 2：清理 Metro 缓存

```bash
cd /Users/yumingliao/YML/solefoodmvp
npx expo start --clear
```

### 检查 3：防火墙 / 网络

确保本机没有阻止 `localhost:8081`（一般不需要改）。

---

## 💡 使用 Xcode 时的流程

1. **先启动 Metro**（终端）：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npm start
   ```

2. **等 Metro 就绪**（看到 "waiting on" 或 QR code）

3. **再在 Xcode 中运行**：按 `⌘R`

**顺序不能反：一定是先 Metro，再运行 App。**

---

## 📝 其他日志说明

### dSYM warning（可忽略）

```
empty dSYM file detected
```

不影响运行，可暂时忽略。

### UIScene lifecycle（未来改动）

```
UIScene lifecycle will soon be required
```

是系统提示，之后需要适配 UIScene，目前不影响当前版本运行。

---

## ✅ 总结

| 问题 | 解决 |
|------|------|
| Connection refused 8081 | 先运行 `npm start`，再运行 App |
| No script URL provided | 同上，确保 Metro 在运行 |
| 使用 Xcode 运行 | 先终端 `npm start`，再 Xcode `⌘R` |

**记住：先 Metro，再 App。**
