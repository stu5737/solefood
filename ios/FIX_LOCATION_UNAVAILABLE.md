# 🚨 修复 ERR_LOCATION_UNAVAILABLE 错误

## 问题说明

错误 `ERR_LOCATION_UNAVAILABLE` 表示应用无法从 iOS 模拟器获取位置数据。这通常是因为：

1. ❌ 模拟器中没有选择 GPX 文件或自定义位置
2. ❌ 位置服务未启用
3. ❌ GPX 文件没有正确加载

---

## ⚡ 快速修复（3 种方法，按速度排序）

### 方法 1：在模拟器中直接设置（最快，30 秒）

**步骤：**

1. **在 iOS 模拟器菜单栏**：
   - 点击顶部菜单：`Features` → `Location`

2. **选择位置**：
   - 如果看到 `28-Jan-2026-1425` 或 `Chishang 10min Loop`，直接选择
   - 如果看不到，选择 `Custom Location...`

3. **如果使用 Custom Location**：
   - 打开文件：`ios/SolefoodMVP/28-Jan-2026-1425.gpx`
   - 找到第一个 `<trkpt>` 标签：
     ```xml
     <trkpt lat="22.53154770441994" lon="120.96727824091954">
     ```
   - 在 Custom Location 对话框中输入：
     - **Latitude**: `22.53154770441994`
     - **Longitude**: `120.96727824091954`
   - 点击 `OK`

4. **验证**：
   - 菜单栏应该显示：`Features` → `Location` → `✓ Custom Location`（或 GPX 文件名）
   - 如果显示 `None`，说明没有设置成功

5. **重新运行应用**：
   ```bash
   npx expo run:ios
   ```

**注意**：Custom Location 只设置固定位置，不会自动移动。如果需要模拟移动轨迹，必须使用方法 2 或 3。

---

### 方法 2：在 Xcode 中配置 GPX 文件（推荐，永久生效）

**步骤：**

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **编辑 Scheme**：
   - 点击顶部 Scheme 下拉菜单（`SolefoodMVP` 旁边）
   - 选择 `Edit Scheme...`（或按 `⌘<`）

3. **配置位置模拟**：
   - 左侧选择 `Run` → `Options`
   - 找到 `Core Location` 部分
   - 在 `Default Location` 下拉菜单中：
     - 应该看到 `Chishang 10min Loop`
     - 应该看到 `28-Jan-2026-1425`
     - **选择 `28-Jan-2026-1425`**

4. **保存**：
   - 点击 `Close` 保存

5. **清理并重新构建**：
   - `Product` → `Clean Build Folder` (`⇧⌘K`)
   - `Product` → `Build` (`⌘B`)

6. **运行应用**：
   ```bash
   npx expo run:ios
   ```

---

### 方法 3：在模拟器中添加 GPX 文件（如果方法 2 不工作）

**步骤：**

1. **在 Xcode 中确认文件存在**：
   - 打开 `ios/SolefoodMVP.xcworkspace`
   - 在项目导航器中，应该看到：
     - `28-Jan-2026-1425.gpx`
     - `Chishang_10min_Loop.gpx`

2. **如果文件旁边有问号 (?)**：
   - 右键点击文件 → `Show in Finder`
   - 确认文件确实存在
   - 如果不存在，重新添加：
     - 右键点击 `SolefoodMVP` 文件夹
     - `Add Files to "SolefoodMVP"...`
     - 选择 GPX 文件并添加

3. **在模拟器菜单中**：
   - `Features` → `Location` → `GPX File...`
   - 如果看到 GPX 文件选项，直接选择
   - 如果看不到，可能需要重新构建项目

4. **重新构建**：
   ```bash
   cd ios
   xcodebuild clean -workspace SolefoodMVP.xcworkspace -scheme SolefoodMVP
   npx expo run:ios
   ```

---

## ✅ 验证修复是否成功

### 检查 1：模拟器菜单

在模拟器菜单栏：
- `Features` → `Location` → **不应该显示 `None`**
- 应该显示：
  - `✓ Custom Location`（如果使用方法 1）
  - `✓ 28-Jan-2026-1425`（如果使用方法 2）
  - `✓ Chishang 10min Loop`（如果选择了这个）

---

### 检查 2：控制台日志

运行应用后，查看控制台：

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

如果仍然失败，继续下一步。

---

### 检查 3：应用权限

1. **在模拟器中**：
   - `Settings` → `Privacy & Security` → `Location Services`
   - 确保 `Location Services` 开关是 **ON**
   - 向下滚动，找到 `SolefoodMVP`
   - 确保权限设置为 `While Using the App` 或 `Always`

2. **如果应用不在列表中**：
   - 重新运行应用
   - 应用会请求位置权限
   - 选择 `Allow While Using App`

---

## 🔧 如果所有方法都不工作

### 终极解决方案：重置模拟器位置设置

1. **完全关闭模拟器**

2. **删除模拟器数据**（可选，会清除所有应用数据）：
   ```bash
   xcrun simctl erase all
   ```
   **警告**：这会删除所有模拟器数据！

3. **或者只重置位置设置**：
   - 打开模拟器
   - `Features` → `Location` → `None`
   - 然后重新选择 GPX 文件或 Custom Location

4. **重新运行应用**：
   ```bash
   npx expo run:ios
   ```

---

## 📝 常见问题

### Q: 为什么模拟器菜单中没有 GPX 文件选项？

**A:** 可能的原因：
1. GPX 文件没有正确添加到 Xcode 项目
2. Scheme 配置没有保存
3. Xcode 缓存了旧配置

**解决方法**：
- 在 Xcode 中手动添加文件（确保在项目导航器中可见）
- 在 Scheme 中配置为默认位置
- 清理构建缓存并重新构建

---

### Q: Custom Location 设置了，但应用仍然报错？

**A:** 检查：
1. 坐标是否正确（不要有空格或特殊字符）
2. 模拟器菜单是否显示 `✓ Custom Location`（不是 `None`）
3. 应用是否有位置权限

**解决方法**：
- 重新设置 Custom Location
- 检查应用权限设置
- 重新运行应用

---

### Q: 在 Xcode 中配置了 GPX，但模拟器菜单中还是看不到？

**A:** 这很正常。Xcode Scheme 配置的 GPX 文件不会直接出现在模拟器菜单中，但会在应用启动时自动使用。

**验证方法**：
- 运行应用
- 查看控制台日志
- 如果看到位置更新，说明 GPX 文件正在工作

---

## 🎯 推荐流程

**最快的方法**：
1. 使用方法 1（模拟器菜单 → Custom Location）快速测试
2. 如果成功，再使用方法 2（Xcode Scheme）永久配置

**最稳定的方法**：
1. 使用方法 2（Xcode Scheme）配置 GPX 文件
2. 清理构建缓存
3. 重新构建并运行

---

## 📞 如果问题仍然存在

请提供以下信息：
1. 模拟器菜单显示的位置设置（`Features` → `Location` → 显示什么？）
2. 控制台的完整错误日志
3. Xcode Scheme 中的 `Default Location` 设置（截图）
