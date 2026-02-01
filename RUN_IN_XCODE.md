# 🚀 在 Xcode 中运行（最简单的方法）

## 问题

命令行运行遇到各种错误（构建锁定、找不到模拟器等）。

**最简单的解决方案：在 Xcode 中直接运行。**

---

## ✅ 推荐方法：使用 Xcode（最稳定）

### 步骤 1：打开 Xcode

```bash
open ios/SolefoodMVP.xcworkspace
```

**重要**：必须打开 `.xcworkspace`，不是 `.xcodeproj`！

---

### 步骤 2：配置 GPX 文件

1. **编辑 Scheme**：
   - 点击顶部 Scheme 下拉菜单 → `Edit Scheme...`（或按 `⌘<`）

2. **添加 Pre-action（可选，自动更新 GPX 时间戳）**：
   - 左侧选择 `Run`
   - 点击 `Pre-actions` 左边的小三角展开
   - 点击底部的 `+` → `New Run Script Action`
   - 输入：
     ```bash
     cd "${SRCROOT}/.."
     python3 ios/update_gpx_time.py
     ```
   - `Provide build settings from` → 选择 `SolefoodMVP`

3. **配置位置**：
   - 点击 `Options` 标签
   - 找到 `Core Location` 部分
   - `Default Location` → 选择 `28-Jan-2026-1425`
   - 或选择 `City Run` 来测试

4. **保存**：
   - 点击 `Close`

---

### 步骤 3：在模拟器中设置位置（双重保险）

1. **在 iOS 模拟器菜单栏**：
   - `Features` → `Location` → `City Run`

2. **确认设置**：
   - 菜单应该显示 `✓ City Run`

---

### 步骤 4：运行应用

在 Xcode 中：
- 点击运行按钮（▶️）
- 或按快捷键：`⌘R`

---

### 步骤 5：观察游标移动

1. **等待应用启动**

2. **按"GO"按钮开始采集**（如果需要）

3. **观察**：
   - 游标应该开始移动
   - 跟随 City Run 或 GPX 轨迹

---

## 🎯 为什么使用 Xcode 更好？

### 优点

1. **稳定性高**：
   - 不会有构建锁定问题
   - 不会找不到模拟器
   - Xcode 自动管理所有依赖

2. **调试方便**：
   - 可以看到详细的日志
   - 可以设置断点调试
   - 可以查看内存和性能

3. **配置简单**：
   - 一次性配置 GPX（在 Scheme 中）
   - 以后每次运行都会自动使用

4. **不需要记命令**：
   - 只需要按 `⌘R` 运行

---

## 📋 完整工作流程

### 初始设置（一次性）

```bash
# 1. 打开 Xcode
open ios/SolefoodMVP.xcworkspace

# 2. 配置 Scheme（参考上面的步骤 2）
# 3. 在模拟器中选择 City Run
```

### 日常使用

```bash
# 1. 打开 Xcode
open ios/SolefoodMVP.xcworkspace

# 2. 按 ⌘R 运行
```

就这么简单！

---

## 🔍 如果 Xcode 中也不工作

### 检查 1：清理构建

在 Xcode 中：
1. `Product` → `Clean Build Folder`（`⇧⌘K`）
2. 等待清理完成
3. 重新运行（`⌘R`）

### 检查 2：确认模拟器位置

在模拟器菜单栏：
- `Features` → `Location` → 应该显示 `✓ City Run`（或 GPX 文件名）
- 不能显示 `None`

### 检查 3：查看控制台日志

在 Xcode 底部的控制台中，应该看到：
```
✅ 位置權限已授予
✅ 初始位置已獲取
[Location Update] 📍 位置更新
```

如果看不到这些日志，说明位置监听有问题。

---

## 💡 调试技巧

### 技巧 1：使用 City Run 测试

**最简单的测试方法**：
1. 模拟器菜单：`Features` → `Location` → `City Run`
2. 在 Xcode 中运行（`⌘R`）
3. 观察游标是否移动

如果 City Run 能工作，说明位置模拟功能正常，GPX 文件也应该能工作。

### 技巧 2：使用 Fixed Location 测试定位

1. 模拟器菜单：`Features` → `Location` → `Custom Location...`
2. 输入坐标：
   - Latitude: `22.531547`
   - Longitude: `120.967278`
3. 在 Xcode 中运行
4. 检查地图是否定位到高雄

如果能正确定位，说明基本功能正常。

### 技巧 3：查看详细日志

在 Xcode 中：
1. 点击底部的日志区域
2. 搜索 `Location` 或 `MapboxRealTimeMap`
3. 查看是否有错误信息

---

## 🎯 推荐的开发流程

### 开发时

**使用 Xcode**：
1. `open ios/SolefoodMVP.xcworkspace`
2. 按 `⌘R` 运行
3. 在 Xcode 中调试

### 测试 GPX 时

1. 先测试 City Run 是否工作
2. 如果 City Run 工作，再切换到 GPX
3. 在模拟器菜单中选择 GPX 文件

### 更新代码后

1. 在 Xcode 中按 `⌘R` 重新运行
2. 不需要清理构建（除非遇到问题）

---

## ✅ 总结

**命令行遇到问题 → 改用 Xcode**

1. ✅ 打开 Xcode：`open ios/SolefoodMVP.xcworkspace`
2. ✅ 配置 Scheme（一次性）
3. ✅ 选择 City Run：模拟器菜单 → `Features` → `Location` → `City Run`
4. ✅ 运行应用：在 Xcode 中按 `⌘R`
5. ✅ 观察游标移动

**这是最简单、最稳定的方法！**
