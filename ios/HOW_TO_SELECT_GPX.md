# 如何在模拟器中选择 GPX 文件

## ✅ 已完成的配置

我已经将两个 GPX 文件添加到 Xcode 项目中：
- ✅ `Chishang_10min_Loop.gpx`
- ✅ `28-Jan-2026-1425.gpx`

---

## 🚀 在 Xcode 中配置 GPX 文件（推荐）

### 步骤：

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **编辑 Scheme**：
   - 点击顶部 Scheme 下拉菜单（SolefoodMVP 旁边）
   - 选择 `Edit Scheme...`（或按 ⌘<）

3. **配置位置模拟**：
   - 左侧选择 `Run` → `Options`
   - 找到 `Core Location` 部分
   - 在 `Default Location` 下拉菜单中：
     - 应该看到 `Chishang 10min Loop`
     - 应该看到 `28-Jan-2026-1425`
     - **选择 `28-Jan-2026-1425`**

4. **保存**：
   - 点击 `Close` 保存

5. **运行应用**：
   ```bash
   npx expo run:ios
   ```

---

## 📱 在模拟器菜单中直接选择（临时方案）

如果 Xcode 配置后，模拟器菜单中仍然看不到 GPX 文件：

### 方法 1：使用 Custom Location（最快）

1. **在模拟器菜单栏**：
   - `Features` → `Location` → `Custom Location...`

2. **输入第一个 GPX 点的坐标**：
   - 打开 `28-Jan-2026-1425.gpx` 文件
   - 找到第一个 `<trkpt>` 的坐标
   - 例如：`lat="22.53154770441994" lon="120.96727824091954"`
   - 输入到 Custom Location 对话框

3. **点击 OK**

**注意**：这个方法只设置固定位置，不会自动移动。如果需要模拟移动，必须使用 GPX 文件。

---

### 方法 2：通过 Xcode 添加 GPX 文件到菜单

如果模拟器菜单中没有 GPX 文件选项：

1. **在 Xcode 中**：
   - 确保 GPX 文件在项目导航器中可见
   - 文件应该在 `SolefoodMVP` 文件夹下

2. **重新构建项目**：
   - `Product` → `Clean Build Folder` (⇧⌘K)
   - `Product` → `Build` (⌘B)

3. **重新运行应用**：
   ```bash
   npx expo run:ios
   ```

4. **检查模拟器菜单**：
   - `Features` → `Location` → 应该看到 GPX 文件选项

---

## 🔍 验证 GPX 文件是否生效

### 检查 1：控制台日志

运行应用后，查看控制台：

```
✅ 初始位置已獲取: { lat: "22.531547", lon: "120.967278", ... }
[Location Update] 📍 位置更新: { lat: "...", lon: "...", ... }
```

**如果坐标在变化**：
- ✅ GPX 文件正常工作
- ✅ 应用正在接收位置更新

**如果坐标一直不变**：
- ❌ 检查模拟器设置
- ❌ 检查 GPX 文件格式

---

### 检查 2：模拟器菜单

在模拟器菜单栏：
- `Features` → `Location` → 应该显示您选择的 GPX 文件名称（有 ✓）

---

### 检查 3：地图显示

- 用户位置标记应该在地图上
- 如果开始采集，位置应该按照 GPX 轨迹移动

---

## 🐛 如果还是看不到 GPX 文件选项

### 解决方案：

1. **完全关闭 Xcode**

2. **重新打开项目**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

3. **在 Xcode 中验证文件**：
   - 项目导航器中应该看到：
     - `Chishang_10min_Loop.gpx`
     - `28-Jan-2026-1425.gpx`
   - 如果看不到，右键点击 `SolefoodMVP` 文件夹
   - `Add Files to "SolefoodMVP"...`
   - 选择 GPX 文件并添加

4. **重新配置 Scheme**：
   - `Scheme` → `Edit Scheme...`
   - `Run` → `Options` → `Core Location`
   - `Default Location` → 应该看到两个 GPX 文件选项

5. **重新运行**：
   ```bash
   npx expo run:ios
   ```

---

## 💡 提示

**为什么模拟器菜单中看不到 GPX 文件？**

可能的原因：
1. GPX 文件没有正确添加到 Xcode 项目
2. Scheme 配置没有保存
3. Xcode 缓存了旧配置

**解决方法**：
- 在 Xcode 中手动添加文件（确保在项目导航器中可见）
- 在 Scheme 中配置为默认位置
- 清理构建缓存并重新构建

---

## 📝 当前状态

✅ GPX 文件已添加到项目文件
✅ Scheme 配置已更新
⏳ 需要在 Xcode 中重新打开项目以刷新配置

**下一步**：
1. 关闭 Xcode（如果正在运行）
2. 重新打开：`open ios/SolefoodMVP.xcworkspace`
3. 在 Scheme 中选择 GPX 文件
4. 运行应用
