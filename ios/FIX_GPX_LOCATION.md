# 修复 GPX 位置模拟问题

## 问题
iOS 模拟器仍然显示 "iOS City Run" 而不是 "Chishang 10min Loop"

## 解决方案

### 方法 1：在 Xcode 中手动选择（最快）

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **编辑 Scheme**：
   - 点击顶部工具栏的 Scheme 下拉菜单（SolefoodMVP 旁边）
   - 选择 `Edit Scheme...`

3. **设置位置**：
   - 左侧选择 `Run` → `Options`
   - 找到 `Core Location` 部分
   - 在 `Default Location` 下拉菜单中：
     - 如果看到 `Chishang 10min Loop`，选择它
     - 如果没有，点击 `Add GPX File to Project...`
     - 导航到 `SolefoodMVP/Chishang_10min_Loop.gpx` 并选择

4. **保存并运行**：
   - 点击 `Close` 保存
   - 运行应用：⌘R 或 `npx expo run:ios`

---

### 方法 2：通过模拟器菜单（运行时切换）

如果应用已经在运行：

1. **在 iOS 模拟器中**：
   - 菜单栏：`Features` → `Location` → `Custom Location...`
   - 或者：`Features` → `Location` → `GPX File...`
   - 选择 `Chishang_10min_Loop.gpx`

**注意**：这个方法只是临时切换，下次运行应用时会恢复 Scheme 中的设置。

---

### 方法 3：清理并重新构建

如果上述方法都不行：

```bash
# 1. 清理构建缓存
cd ios
xcodebuild clean -workspace SolefoodMVP.xcworkspace -scheme SolefoodMVP

# 2. 重新打开 Xcode
open SolefoodMVP.xcworkspace

# 3. 在 Xcode 中：
#    - Product → Clean Build Folder (⇧⌘K)
#    - 然后按照方法 1 重新配置 GPX

# 4. 重新运行
npx expo run:ios
```

---

## 验证配置

运行应用后，检查：

1. **控制台日志**：
   - 应该看到位置在池上车站附近（23.126°N, 121.214°E）

2. **地图显示**：
   - 地图应该自动定位到池上车站
   - 位置会按照 GPX 轨迹自动移动

3. **模拟器状态栏**：
   - 如果看到位置图标，点击它应该显示 "Chishang 10min Loop"

---

## 常见问题

### Q: 为什么还是显示 "iOS City Run"？
A: 可能是 Xcode 缓存了旧的配置。尝试：
- 完全退出 Xcode
- 重新打开项目
- 按照方法 1 重新配置

### Q: GPX 文件在下拉菜单中找不到？
A: 确保：
- GPX 文件已添加到 Xcode 项目中（应该在项目导航器中可见）
- 文件在 `SolefoodMVP` target 中
- 文件路径正确

### Q: 位置没有更新？
A: 检查：
- 应用是否有位置权限
- 在模拟器中：`Settings` → `Privacy & Security` → `Location Services` → 确保应用已启用
- 重启应用
