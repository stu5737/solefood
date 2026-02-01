# 📍 在 Xcode 中设置 GPX 文件（无法在模拟器菜单选择时的解决方案）

## 问题说明

如果模拟器菜单（`Features` → `Location`）中看不到您的 GPX 文件选项，这是正常的。**Xcode Scheme 中配置的 GPX 文件不会直接出现在模拟器菜单中**，但会在应用启动时自动使用。

**解决方案**：在 Xcode 的 Scheme 编辑器中直接配置 GPX 文件。

---

## ✅ 完整步骤（5 分钟）

### 步骤 1：打开 Xcode

```bash
open ios/SolefoodMVP.xcworkspace
```

**重要**：必须打开 `.xcworkspace` 文件，不是 `.xcodeproj`！

---

### 步骤 2：编辑 Scheme

1. **点击顶部 Scheme 下拉菜单**：
   - 在 Xcode 顶部工具栏，找到 `SolefoodMVP` 旁边的 Scheme 选择器
   - 点击它

2. **选择 "Edit Scheme..."**：
   - 在下拉菜单中，选择 `Edit Scheme...`
   - 或者直接按快捷键：`⌘<`（Command + 逗号）

---

### 步骤 3：配置位置模拟

1. **选择 Run 选项**：
   - 在左侧边栏，点击 `Run`
   - 然后点击 `Options` 标签

2. **找到 Core Location 部分**：
   - 向下滚动，找到 `Core Location` 部分
   - 应该看到 `Default Location` 下拉菜单

3. **选择 GPX 文件**：
   - 点击 `Default Location` 下拉菜单
   - 应该看到以下选项：
     - `None`
     - `Chishang 10min Loop`
     - `28-Jan-2026-1425` ← **选择这个**
     - 其他预设选项（City Run, Apple, 等）

4. **如果看不到 GPX 文件选项**：
   - 点击下拉菜单底部的 `Add GPX File...`
   - 导航到：`SolefoodMVP/28-Jan-2026-1425.gpx`
   - 选择文件并点击 `Open`

---

### 步骤 4：保存配置

1. **点击 `Close` 按钮**：
   - 在 Scheme 编辑器窗口底部，点击 `Close`
   - 配置会自动保存

---

### 步骤 5：清理并重新构建

1. **清理构建缓存**：
   - 在 Xcode 菜单栏：`Product` → `Clean Build Folder`
   - 或按快捷键：`⇧⌘K`（Shift + Command + K）

2. **重新构建**：
   - `Product` → `Build`
   - 或按快捷键：`⌘B`（Command + B）

---

### 步骤 6：运行应用

**方法 1：在 Xcode 中运行**
- 点击 Xcode 顶部的运行按钮（▶️）
- 或按快捷键：`⌘R`（Command + R）

**方法 2：使用命令行**
```bash
npx expo run:ios
```

---

## ✅ 验证配置是否成功

### 检查 1：控制台日志

运行应用后，查看控制台（Xcode 底部或终端）：

**✅ 成功的情况**：
```
[MapboxRealTimeMap] ✅ 位置權限已授予
[MapboxRealTimeMap] ✅ 初始位置已獲取: { lat: "22.531547", lon: "120.967278", ... }
[Location Update] 📍 位置更新: { lat: "...", lon: "...", ... }
```

**❌ 仍然失败的情况**：
```
[MapboxRealTimeMap] ❌ 位置追蹤失敗: ...
ERR_LOCATION_UNAVAILABLE
```

---

### 检查 2：地图显示

- 应用启动后，地图应该定位到 GPX 文件的起始位置
- 用户位置标记应该出现在地图上
- 如果开始采集，位置应该按照 GPX 轨迹移动

---

### 检查 3：Xcode Scheme 设置

1. **再次打开 Scheme 编辑器**：
   - `Scheme` → `Edit Scheme...`

2. **确认设置**：
   - `Run` → `Options` → `Core Location`
   - `Default Location` 应该显示：`28-Jan-2026-1425`（有选中标记）

---

## 🐛 如果仍然不工作

### 问题 1：GPX 文件不在 Xcode 项目中

**症状**：在 Scheme 编辑器中看不到 GPX 文件选项

**解决方法**：

1. **在 Xcode 项目导航器中检查**：
   - 左侧项目导航器，找到 `SolefoodMVP` 文件夹
   - 应该看到 `28-Jan-2026-1425.gpx` 文件
   - 如果看不到，继续下一步

2. **手动添加文件**：
   - 右键点击 `SolefoodMVP` 文件夹
   - 选择 `Add Files to "SolefoodMVP"...`
   - 导航到：`ios/SolefoodMVP/28-Jan-2026-1425.gpx`
   - **重要**：确保勾选：
     - ✅ `Copy items if needed`（如果文件不在项目目录中）
     - ✅ `Add to targets: SolefoodMVP`
   - 点击 `Add`

3. **重新配置 Scheme**：
   - 按照上面的步骤 2-4 重新配置

---

### 问题 2：文件路径错误

**症状**：选择了 GPX 文件，但应用仍然无法获取位置

**解决方法**：

1. **检查文件路径**：
   - 在 Xcode 项目导航器中，右键点击 `28-Jan-2026-1425.gpx`
   - 选择 `Show in Finder`
   - 确认文件确实存在

2. **检查 Scheme 配置**：
   - `Scheme` → `Edit Scheme...`
   - `Run` → `Options` → `Core Location`
   - `Default Location` → 应该显示正确的文件名

3. **如果路径错误，重新添加**：
   - 在 `Default Location` 下拉菜单中，选择 `Add GPX File...`
   - 重新选择文件

---

### 问题 3：Xcode 缓存问题

**症状**：配置看起来正确，但应用仍然无法获取位置

**解决方法**：

1. **完全关闭 Xcode**

2. **清理 Derived Data**：
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

3. **重新打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

4. **清理并重新构建**：
   - `Product` → `Clean Build Folder` (`⇧⌘K`)
   - `Product` → `Build` (`⌘B`)

5. **重新运行应用**

---

## 💡 重要提示

### 为什么模拟器菜单中看不到 GPX 文件？

**原因**：
- Xcode Scheme 中配置的 GPX 文件是**应用级别的设置**
- 模拟器菜单中的位置选项是**模拟器级别的设置**
- 两者是独立的系统

**结果**：
- 在 Xcode Scheme 中配置的 GPX 文件**不会**出现在模拟器菜单中
- 但应用启动时会**自动使用**Scheme 中配置的 GPX 文件
- 这是**正常行为**，不是错误

---

### 推荐工作流程

1. **开发时**：
   - 在 Xcode Scheme 中配置 GPX 文件（永久生效）
   - 每次运行应用时自动使用 GPX 文件

2. **测试时**：
   - 如果需要临时切换位置，可以在模拟器菜单中使用 `Custom Location`
   - 但记住，Xcode Scheme 的配置优先级更高

---

## 📝 总结

**如果无法在模拟器菜单中选择 GPX 文件**：

1. ✅ **这是正常的** - Xcode Scheme 配置的 GPX 不会出现在模拟器菜单中
2. ✅ **在 Xcode 中配置** - 使用 Scheme 编辑器设置 GPX 文件
3. ✅ **验证配置** - 查看控制台日志确认位置更新
4. ✅ **如果失败** - 检查文件是否在项目中，清理缓存，重新构建

**关键点**：Xcode Scheme 配置的 GPX 文件会在应用启动时自动使用，无需在模拟器菜单中手动选择。
