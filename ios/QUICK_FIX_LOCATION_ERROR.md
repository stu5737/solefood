# 🚨 快速修复 ERR_LOCATION_UNAVAILABLE 错误

## 当前问题

应用仍然无法获取位置数据，显示 `ERR_LOCATION_UNAVAILABLE` 错误。

---

## ⚡ 立即执行的 5 个步骤（按顺序）

### 步骤 1：在 Xcode 中确认 GPX 文件配置

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **编辑 Scheme**：
   - 点击顶部 Scheme 下拉菜单 → `Edit Scheme...`（或 `⌘<`）
   - 左侧选择 `Run` → `Options`
   - 找到 `Core Location` 部分

3. **检查并设置 Default Location**：
   - 点击 `Default Location` 下拉菜单
   - **必须选择**：`28-Jan-2026-1425` 或 `Chishang 10min Loop`
   - **不能是**：`None` 或其他预设（City Run, Apple 等）

4. **如果看不到 GPX 文件选项**：
   - 点击 `Add GPX File...`
   - 导航到：`SolefoodMVP/28-Jan-2026-1425.gpx`
   - 选择文件并点击 `Open`

5. **保存**：
   - 点击 `Close` 保存配置

---

### 步骤 2：清理并重新构建

1. **在 Xcode 中**：
   - `Product` → `Clean Build Folder`（或 `⇧⌘K`）
   - 等待清理完成

2. **重新构建**：
   - `Product` → `Build`（或 `⌘B`）
   - 等待构建完成

---

### 步骤 3：在模拟器中设置位置（双重保险）

即使 Xcode Scheme 已配置，也请在模拟器中设置：

1. **在 iOS 模拟器菜单栏**：
   - `Features` → `Location`

2. **选择位置**：
   - 如果看到 `28-Jan-2026-1425` 或 `Chishang 10min Loop`，选择它
   - 如果看不到，选择 `Custom Location...`

3. **如果使用 Custom Location**：
   - 打开文件：`ios/SolefoodMVP/28-Jan-2026-1425.gpx`
   - 找到第一个坐标点：
     - **Latitude**: `22.53154770441994`
     - **Longitude**: `120.96727824091954`
   - 在对话框中输入这两个坐标
   - 点击 `OK`

4. **验证**：
   - 菜单栏应显示：`Features` → `Location` → `✓ Custom Location`（或 GPX 文件名）
   - **不能显示** `None`

---

### 步骤 4：检查应用权限

1. **在模拟器中**：
   - 打开 `Settings` 应用
   - `Privacy & Security` → `Location Services`
   - 确保 `Location Services` 开关是 **ON**

2. **检查应用权限**：
   - 向下滚动，找到 `SolefoodMVP`
   - 确保权限设置为：
     - `While Using the App` 或
     - `Always`

3. **如果应用不在列表中**：
   - 重新运行应用
   - 应用会弹出权限请求
   - **必须选择** `Allow While Using App` 或 `Allow Once`

---

### 步骤 5：重新运行应用

1. **完全关闭应用**（如果正在运行）：
   - 在模拟器中，双击 Home 键（或上滑）
   - 向上滑动应用卡片关闭应用

2. **重新运行**：
   ```bash
   npx expo run:ios
   ```
   或
   - 在 Xcode 中按 `⌘R` 运行

3. **观察控制台**：
   - 应该看到：
     ```
     ✅ 位置權限已授予
     ✅ 初始位置已獲取: { lat: "22.531547", lon: "120.967278", ... }
     ```
   - **不应该看到**：`ERR_LOCATION_UNAVAILABLE`

---

## ✅ 验证清单

运行以下检查，确保所有配置正确：

- [ ] **Xcode Scheme 配置**：
  - [ ] `Run` → `Options` → `Core Location` → `Default Location` 不是 `None`
  - [ ] 选择了 `28-Jan-2026-1425` 或 `Chishang 10min Loop`

- [ ] **模拟器位置设置**：
  - [ ] `Features` → `Location` 不是 `None`
  - [ ] 显示 `Custom Location` 或 GPX 文件名（有 ✓）

- [ ] **应用权限**：
  - [ ] `Settings` → `Privacy & Security` → `Location Services` 是 **ON**
  - [ ] `SolefoodMVP` 的权限是 `While Using the App` 或 `Always`

- [ ] **构建状态**：
  - [ ] 已执行 `Clean Build Folder`
  - [ ] 已重新构建项目
  - [ ] 构建成功，没有错误

- [ ] **应用运行**：
  - [ ] 应用已完全关闭并重新启动
  - [ ] 控制台显示位置更新，没有 `ERR_LOCATION_UNAVAILABLE`

---

## 🐛 如果仍然不工作

### 方法 A：重置模拟器位置设置

1. **在模拟器菜单栏**：
   - `Features` → `Location` → `None`
   - 等待 2 秒
   - 然后重新选择 `Custom Location` 或 GPX 文件

2. **重新运行应用**

---

### 方法 B：完全重置模拟器

**警告**：这会删除所有模拟器数据！

1. **关闭模拟器**

2. **重置模拟器**：
   ```bash
   xcrun simctl erase all
   ```

3. **重新打开 Xcode 并运行应用**

---

### 方法 C：检查 GPX 文件格式

1. **打开 GPX 文件**：
   ```bash
   open ios/SolefoodMVP/28-Jan-2026-1425.gpx
   ```

2. **检查文件格式**：
   - 文件应该以 `<?xml version="1.0" encoding="UTF-8"?>` 开头
   - 应该包含 `<gpx>` 标签
   - 应该包含 `<trkpt>` 标签，每个都有 `lat` 和 `lon` 属性
   - 每个 `<trkpt>` 应该有 `<time>` 标签

3. **如果文件格式错误**：
   - 重新下载或生成 GPX 文件
   - 确保文件是有效的 XML 格式

---

### 方法 D：检查 Xcode 项目文件

1. **在 Xcode 项目导航器中**：
   - 找到 `SolefoodMVP` 文件夹
   - 应该看到 `28-Jan-2026-1425.gpx` 文件
   - 文件图标应该是正常的（不是问号 `?`）

2. **如果文件旁边有问号**：
   - 右键点击文件 → `Show in Finder`
   - 确认文件确实存在
   - 如果不存在，重新添加文件到项目

---

## 📝 常见错误原因

1. **Xcode Scheme 中选择了 `None`**
   - ✅ 解决：在 Scheme 编辑器中选择 GPX 文件

2. **模拟器位置设置为 `None`**
   - ✅ 解决：在模拟器菜单中设置 `Custom Location` 或 GPX 文件

3. **应用没有位置权限**
   - ✅ 解决：在 Settings 中授予位置权限

4. **构建缓存问题**
   - ✅ 解决：清理构建缓存并重新构建

5. **GPX 文件路径错误**
   - ✅ 解决：在 Xcode 中重新添加 GPX 文件

---

## 🎯 推荐工作流程

**每次遇到位置错误时，按顺序执行**：

1. ✅ 检查 Xcode Scheme 配置
2. ✅ 检查模拟器位置设置
3. ✅ 检查应用权限
4. ✅ 清理并重新构建
5. ✅ 重新运行应用
6. ✅ 查看控制台日志验证

---

## 💡 提示

**为什么需要同时配置 Xcode 和模拟器？**

- **Xcode Scheme**：应用启动时自动使用（永久配置）
- **模拟器菜单**：模拟器级别的设置（临时配置）
- **两者都配置**：确保无论哪种方式都能工作（双重保险）

**如果只配置一个不工作，配置另一个通常可以解决问题。**

---

## 📞 如果问题仍然存在

请提供以下信息：

1. **Xcode Scheme 截图**：
   - `Scheme` → `Edit Scheme...` → `Run` → `Options` → `Core Location`

2. **模拟器菜单截图**：
   - `Features` → `Location` → 显示什么？

3. **应用权限截图**：
   - `Settings` → `Privacy & Security` → `Location Services` → `SolefoodMVP`

4. **控制台完整日志**：
   - 从应用启动到错误发生的所有日志
