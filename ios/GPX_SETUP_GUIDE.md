# iOS 模拟器 GPX 轨迹设置指南

## ✅ 配置已完成！

GPX 文件已自动添加到 Xcode 项目中，并配置为默认位置模拟。

**文件位置**：`ios/SolefoodMVP/Chishang_10min_Loop.gpx`

**轨迹信息**：
- **名称**：Chishang Station 10-min City Loop
- **路线**：Station → Tiehua Rd → Zhongzheng Rd → Zhongshan Rd → Station
- **时长**：约 10 分钟
- **点数**：7 个 GPS 点

---

## 🚀 立即使用

### 方法 1：直接运行（推荐）

配置已完成，直接运行即可：

```bash
npx expo run:ios
```

应用启动后，iOS 模拟器会自动使用 GPX 轨迹模拟位置。

---

### 方法 2：在 Xcode 中验证配置（可选）

如果想在 Xcode 中查看或修改配置：

1. **打开 Xcode 项目**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **查看 Scheme 配置**：
   - 在 Xcode 顶部工具栏，点击 Scheme 下拉菜单
   - 选择 `SolefoodMVP` → `Edit Scheme...`
   - 在左侧菜单选择 `Run` → `Options`
   - 找到 `Core Location` 部分
   - 应该看到 `Default Location` 已设置为 `Chishang 10min Loop`

3. **运行应用**：
   - 在 Xcode 中点击运行按钮（⌘R）
   - 或者使用命令行：`npx expo run:ios`

---

### 方法 3：通过模拟器菜单临时切换（运行时）

如果需要临时切换到其他位置：

1. **启动应用**：
   ```bash
   npx expo run:ios
   ```

2. **在模拟器中切换位置**：
   - 在 iOS 模拟器菜单栏：`Features` → `Location` → `Custom Location...`
   - 或者：`Features` → `Location` → `GPX File...`
   - 选择其他 GPX 文件或自定义位置

**注意**：下次运行应用时，会自动恢复使用 `Chishang_10min_Loop.gpx`（因为已在 Scheme 中配置）

---

## ✅ 验证 GPX 文件是否生效

运行应用后，检查：

1. **控制台日志**：
   - 应该看到 GPS 位置更新日志
   - 位置应该在池上车站附近（23.126°N, 121.214°E）

2. **地图显示**：
   - 地图应该自动定位到池上车站
   - 如果开始采集，GPS 轨迹应该沿着 GPX 路线移动

3. **位置变化**：
   - 每 2-4 分钟，位置应该自动移动到下一个 GPX 点
   - 总共 7 个点，约 10 分钟完成一圈

---

## 🔧 故障排除

### 问题 1：GPX 文件未出现在下拉菜单

**解决方案**：
- 确保 GPX 文件已添加到 Xcode 项目中（方法 3）
- 检查文件是否在 `SolefoodMVP` target 中

### 问题 2：位置没有更新

**解决方案**：
- 检查应用是否有位置权限
- 在模拟器中：`Settings` → `Privacy & Security` → `Location Services` → 确保应用已启用
- 重启应用

### 问题 3：位置更新太快或太慢

**解决方案**：
- GPX 文件中的 `<time>` 标签控制时间间隔
- 当前设置：每个点间隔 2-2.5 分钟
- 如需调整，修改 GPX 文件中的 `<time>` 值

---

## 📝 GPX 文件格式说明

当前 GPX 文件包含：
- **7 个轨迹点**（trkpt）
- **每个点包含**：
  - `lat` / `lon`：经纬度
  - `ele`：海拔高度（米）
  - `time`：时间戳（ISO 8601 格式）

**时间间隔**：
- 点 1 → 点 2：2 分钟
- 点 2 → 点 3：2.5 分钟
- 点 3 → 点 4：1.5 分钟
- 点 4 → 点 5：1.5 分钟
- 点 5 → 点 6：1.5 分钟
- 点 6 → 点 7：1.5 分钟
- **总时长**：约 10.5 分钟

---

## 🎯 快速开始

```bash
# 1. 打开 Xcode
open ios/SolefoodMVP.xcworkspace

# 2. 在 Xcode 中：
#    - 选择 Scheme: SolefoodMVP → Edit Scheme
#    - Run → Options → Core Location → Default Location
#    - 选择 Chishang_10min_Loop.gpx

# 3. 运行应用
npx expo run:ios
```

---

## 📚 参考资源

- [Apple Developer: Simulating Location in iOS Simulator](https://developer.apple.com/documentation/corelocation/simulating_location_in_the_ios_simulator)
- [Xcode: Adding GPX Files](https://developer.apple.com/documentation/xcode/adding-a-gpx-file-to-your-scheme)
