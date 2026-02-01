# 如何让 GPX 文件出现在模拟器菜单中

## 问题
GPX 文件已配置，但在模拟器的 `Features → Location` 菜单中看不到 "Chishang 10min Loop" 选项。

## 解决方案

### 方法 1：在 Xcode 中手动添加（推荐）

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **编辑 Scheme**：
   - 点击顶部 Scheme 下拉菜单（SolefoodMVP 旁边）
   - 选择 `Edit Scheme...`（或按 ⌘<）

3. **添加 GPX 文件**：
   - 左侧选择 `Run` → `Options`
   - 找到 `Core Location` 部分
   - 在 `Default Location` 下拉菜单中：
     - 点击 `Add GPX File to Project...`
     - 导航到并选择：`SolefoodMVP/Chishang_10min_Loop.gpx`
     - 点击 `Add`

4. **验证**：
   - `Default Location` 应该显示 "Chishang 10min Loop"
   - 点击 `Close` 保存

5. **重新运行应用**：
   ```bash
   npx expo run:ios
   ```

6. **检查模拟器菜单**：
   - `Features` → `Location` → 应该看到 "Chishang 10min Loop"

---

### 方法 2：使用 Custom Location（临时方案）

如果方法 1 不行，可以先用 Custom Location：

1. **在模拟器菜单栏**：
   - `Features` → `Location` → `Custom Location...`

2. **输入起始坐标**（池上车站）：
   - **Latitude**: `23.126480`
   - **Longitude**: `121.214800`

3. **点击 OK**

4. **重新运行应用**

**注意**：这个方法只是设置一个固定位置，不会自动移动。如果需要模拟移动轨迹，必须使用方法 1。

---

### 方法 3：检查文件路径

确保 GPX 文件在正确的位置：

```bash
# 检查文件是否存在
ls -la ios/SolefoodMVP/Chishang_10min_Loop.gpx

# 应该显示文件信息
```

如果文件不存在，重新创建：

```bash
# 文件应该在：ios/SolefoodMVP/Chishang_10min_Loop.gpx
```

---

### 方法 4：清理并重新构建

如果以上方法都不行：

1. **在 Xcode 中**：
   - `Product` → `Clean Build Folder` (⇧⌘K)

2. **关闭 Xcode**

3. **重新打开并配置**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```
   - 按照方法 1 重新配置 GPX 文件

4. **重新运行**：
   ```bash
   npx expo run:ios
   ```

---

## 验证

配置成功后：

1. **在模拟器菜单栏**：
   - `Features` → `Location` → 应该看到 "Chishang 10min Loop"（有 ✓ 标记）

2. **运行应用**：
   - 控制台应该显示：`✅ 初始位置已獲取`
   - 地图应该自动定位到池上车站

3. **位置会自动移动**：
   - 每 2-2.5 分钟移动到下一个 GPX 点
   - 约 10 分钟完成一圈

---

## 常见问题

### Q: 为什么菜单中还是没有 GPX 文件？
A: 可能的原因：
- GPX 文件没有正确添加到 Xcode 项目
- Scheme 配置没有保存
- 需要重新构建项目

**解决**：按照方法 1 重新添加，确保点击了 "Add" 和 "Close" 保存。

### Q: 可以使用 Custom Location 模拟移动吗？
A: 不可以。Custom Location 只设置一个固定位置，不会移动。

**解决**：必须使用 GPX 文件才能模拟移动轨迹。

### Q: GPX 文件路径应该是什么？
A: 相对于项目根目录：`SolefoodMVP/Chishang_10min_Loop.gpx`

在 Xcode 项目导航器中应该能看到这个文件。
