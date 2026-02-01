# 修复 iOS 模拟器超时错误

## 错误信息
```
Error: xcrun simctl openurl ... exited with non-zero code: 60
Simulator device failed to open com.solefood.mvp://expo-development-client/...
Operation timed out
```

## 🔧 解决方案

### 方法 1：先构建应用，再启动 Metro（推荐）

**步骤：**

1. **停止当前所有进程**（按 Ctrl+C）

2. **先构建并安装应用**：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npx expo run:ios --no-build-cache
   ```
   
   等待应用完全构建并安装到模拟器（可能需要几分钟）

3. **应用安装完成后，在另一个终端启动 Metro**：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npm start
   ```

4. **在模拟器中手动打开应用**：
   - 如果应用没有自动打开，在模拟器中找到 "Solefood MVP" 应用图标
   - 点击打开

---

### 方法 2：使用 Xcode 直接运行

**步骤：**

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **选择模拟器**：
   - 在 Xcode 顶部，选择 `iPhone 17 Pro Max` 或其他模拟器

3. **构建并运行**：
   - 点击运行按钮（⌘R）
   - 或菜单：`Product` → `Run`

4. **等待应用启动**：
   - 第一次构建可能需要几分钟
   - 应用会自动在模拟器中打开

5. **启动 Metro Bundler**（在另一个终端）：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npm start
   ```

---

### 方法 3：重启模拟器

**步骤：**

1. **关闭模拟器**：
   - 在模拟器中：`Device` → `Shut Down`

2. **重启模拟器**：
   ```bash
   xcrun simctl shutdown all
   xcrun simctl boot "iPhone 17 Pro Max"
   ```

3. **重新运行应用**：
   ```bash
   npx expo run:ios
   ```

---

### 方法 4：清理并重新构建

**步骤：**

1. **清理构建缓存**：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp/ios
   xcodebuild clean -workspace SolefoodMVP.xcworkspace -scheme SolefoodMVP
   ```

2. **清理 Expo 缓存**：
   ```bash
   cd /Users/yumingliao/YML/solefoodmvp
   npx expo start --clear
   ```

3. **重新构建**：
   ```bash
   npx expo run:ios
   ```

---

## ✅ 验证修复

修复后，应该看到：

1. **应用成功安装到模拟器**
2. **应用自动打开**（或可以手动打开）
3. **Metro Bundler 连接成功**
4. **应用正常加载，不再显示超时错误**

---

## 🚀 推荐工作流程

**为了避免超时，建议分步执行：**

**终端 1（构建应用）：**
```bash
npx expo run:ios
# 等待应用完全安装（看到 "Opening on iPhone..." 成功）
```

**终端 2（启动 Metro - 在应用安装后）：**
```bash
npm start
```

**或者使用 Xcode：**
- 在 Xcode 中构建和运行（更稳定）
- 在终端中启动 Metro Bundler

---

## 📝 常见问题

### Q: 为什么会出现超时？
A: Expo CLI 尝试通过 URL scheme 打开应用，但应用可能：
- 还没有完全安装
- 没有正确构建
- 模拟器响应慢

### Q: 应该使用 `expo run:ios` 还是 Xcode？
A: 
- **开发时**：推荐使用 Xcode（更稳定）
- **快速测试**：可以使用 `expo run:ios`（但可能遇到超时）

### Q: 应用安装后还是超时？
A: 尝试：
- 在模拟器中手动打开应用
- 检查 Metro Bundler 是否在运行
- 重启模拟器
