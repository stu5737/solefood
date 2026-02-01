# 修复 Metro Bundler 连接错误

## 错误信息
```
No script URL provided. Make sure the packager is running or you have embedded a JS bundle in your application bundle.
```

## 🔧 解决方案

### 方法 1：启动 Metro Bundler（推荐）

**步骤：**

1. **打开新的终端窗口**（保持应用运行）

2. **启动 Metro Bundler**：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npm start
   # 或者
   npx expo start
   ```

3. **等待 Metro Bundler 启动**：
   - 应该看到类似这样的输出：
     ```
     Metro waiting on exp://192.168.x.x:8081
     ```

4. **在模拟器中重新加载应用**：
   - 按 `⌘R` 重新加载
   - 或者摇动设备 → `Reload`

---

### 方法 2：使用 Expo CLI 启动（一体化）

**步骤：**

1. **停止当前运行的应用**（如果正在运行）

2. **使用 Expo CLI 启动**：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npx expo run:ios
   ```

   这会自动：
   - 启动 Metro Bundler
   - 构建 iOS 应用
   - 在模拟器中运行

---

### 方法 3：清理并重新启动

如果方法 1 和 2 都不行：

1. **停止所有进程**：
   ```bash
   # 停止 Metro Bundler（如果在运行）
   # 按 Ctrl+C
   
   # 停止 iOS 模拟器中的应用
   ```

2. **清理缓存**：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npx expo start --clear
   ```

3. **重新启动**：
   ```bash
   npx expo run:ios
   ```

---

### 方法 4：检查端口占用

如果 8081 端口被占用：

1. **检查端口占用**：
   ```bash
   lsof -i :8081
   ```

2. **杀死占用进程**：
   ```bash
   kill -9 <PID>
   ```

3. **重新启动 Metro**：
   ```bash
   npx expo start
   ```

---

## ✅ 验证修复

修复后，应该看到：

1. **Metro Bundler 运行中**：
   ```
   Metro waiting on exp://...
   ```

2. **应用正常加载**：
   - 不再显示 "No script URL provided" 错误
   - 应用界面正常显示

3. **控制台输出**：
   - 应该看到应用日志
   - 不再有连接错误

---

## 🚀 推荐工作流程

**开发时，建议使用两个终端窗口：**

**终端 1（Metro Bundler）：**
```bash
cd /Users/yumingliao/YML/solefoodmvp
npm start
```

**终端 2（运行应用）：**
```bash
cd /Users/yumingliao/YML/solefoodmvp
npx expo run:ios
```

这样 Metro Bundler 会持续运行，应用可以随时重新加载。

---

## 📝 常见问题

### Q: 为什么会出现这个错误？
A: 应用尝试连接 Metro Bundler 来加载 JavaScript 代码，但找不到运行中的 Metro 服务器。

### Q: 每次都要启动 Metro Bundler 吗？
A: 是的，开发时必须保持 Metro Bundler 运行。生产构建会嵌入 JS bundle，不需要 Metro。

### Q: 可以使用 `expo start` 和 `expo run:ios` 分开运行吗？
A: 可以！先运行 `expo start`，然后在另一个终端运行 `expo run:ios`。
