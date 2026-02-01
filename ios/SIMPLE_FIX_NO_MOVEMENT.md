# 🚨 游标不移动的终极解决方案

## 问题

游标还是静止不动，即使已经设置了 GPX 文件和更新了时间戳。

您只是想要像 iOS 的 **City Run** 一样，看到游标在地图上移动。

---

## ⚡ 最简单的解决方案（3 步骤）

### 步骤 1：先测试 City Run 是否工作

1. **在 iOS 模拟器菜单栏**：
   - `Features` → `Location` → `City Run`

2. **重新运行应用**：
   ```bash
   npx expo run:ios
   ```

3. **观察**：
   - 如果游标开始移动 → 说明位置模拟功能正常，问题出在 GPX 配置
   - 如果游标还是不动 → 说明有更深层的问题

---

### 步骤 2：如果 City Run 能工作，使用这个方法

**问题原因**：GPX 文件可能需要在模拟器菜单中手动加载。

**解决方法**：

1. **在模拟器菜单栏**：
   - `Features` → `Location` → `Custom Location...`

2. **输入起点坐标**（高雄）：
   - **Latitude**: `22.531547`
   - **Longitude**: `120.967278`
   - 点击 `OK`

3. **确认位置已设置**：
   - 重新运行应用
   - 应用应该显示在高雄的位置

4. **如果位置正确显示，再切换到 GPX**：
   - `Features` → `Location` → `28-Jan-2026-1425`
   - 或者选择 `City Run` 来看移动效果

---

### 步骤 3：如果 City Run 也不工作

说明应用的位置监听有问题。检查控制台：

**应该看到**：
```
✅ 位置權限已授予
✅ 初始位置已獲取: { lat: "...", lon: "...", ... }
[Location Update] 📍 位置更新: ...
```

**如果看到**：
```
❌ ERR_LOCATION_UNAVAILABLE
或
⚠️ 位置權限未授予
```

**解决方法**：检查应用权限
1. 模拟器中打开 `Settings`
2. `Privacy & Security` → `Location Services`
3. 确保 `Location Services` 是 **ON**
4. 找到 `SolefoodMVP`，设置为 `While Using the App`

---

## 🔍 诊断：为什么游标不动？

### 可能原因 1：应用没有监听位置更新

**症状**：控制台没有 `[Location Update]` 日志

**解决**：检查代码是否正确启动位置监听

### 可能原因 2：模拟器位置没有变化

**症状**：控制台显示的坐标一直相同

**解决**：
- 在模拟器菜单中确认选择了 `City Run` 或 GPX 文件
- 不能选择 `None` 或 `Custom Location`（固定位置）

### 可能原因 3：地图没有跟随位置

**症状**：控制台显示位置在更新，但游标不动

**解决**：检查地图组件是否正确绑定 `currentLocation`

---

## 💡 快速测试方案

### 测试 1：使用 City Run

```bash
# 1. 在模拟器菜单选择 City Run
# Features → Location → City Run

# 2. 运行应用
npx expo run:ios

# 3. 观察控制台
# 应该看到坐标在变化
```

### 测试 2：使用固定位置

```bash
# 1. 在模拟器菜单选择 Custom Location
# Latitude: 22.531547
# Longitude: 120.967278

# 2. 运行应用
npx expo run:ios

# 3. 检查地图是否定位到高雄
```

---

## 🎯 推荐调试步骤

### 第 1 步：确认位置权限

1. 模拟器 `Settings` → `Privacy & Security` → `Location Services`
2. 确保 `Location Services` 是 **ON**
3. 确保 `SolefoodMVP` 权限是 `While Using the App`

### 第 2 步：确认模拟器位置设置

1. 模拟器菜单：`Features` → `Location`
2. 选择 `City Run`（最简单的测试）
3. 不要选择 `None`

### 第 3 步：运行应用并观察控制台

```bash
npx expo run:ios
```

在控制台中查找：
- `✅ 位置權限已授予` ← 应该看到这个
- `✅ 初始位置已獲取` ← 应该看到这个
- `[Location Update] 📍 位置更新` ← 应该反复看到这个

### 第 4 步：如果控制台显示位置更新

说明位置监听正常，问题可能是：
- 地图组件没有正确渲染
- 游标组件没有正确跟随位置
- 需要开始"采集"才能看到游标

### 第 5 步：检查是否需要按"采集"按钮

**重要**：某些应用设计中，只有按下"开始采集"按钮后，游标才会显示。

检查：
1. 应用启动后，是否需要按底部的 "GO" 按钮？
2. 按下 "GO" 按钮后，游标是否出现并移动？

---

## 🚨 如果还是不工作

请提供以下信息：

1. **控制台日志**（从应用启动到现在的所有日志）

2. **模拟器位置设置截图**：
   - `Features` → `Location` → 显示什么？

3. **应用权限截图**：
   - `Settings` → `Privacy & Security` → `Location Services` → `SolefoodMVP`

4. **回答以下问题**：
   - 使用 `City Run` 时，控制台是否显示位置更新？
   - 使用 `Custom Location` 时，地图是否定位到正确位置？
   - 是否需要按"采集"按钮才能看到游标？

---

## 📋 检查清单

运行应用前，确认以下所有项：

- [ ] 模拟器位置设置不是 `None`（选择 `City Run` 或 GPX）
- [ ] `Location Services` 是 **ON**
- [ ] `SolefoodMVP` 有位置权限（`While Using the App`）
- [ ] 控制台显示 `✅ 位置權限已授予`
- [ ] 控制台显示 `✅ 初始位置已獲取`
- [ ] 控制台反复显示 `[Location Update]`
- [ ] 已按下"采集"按钮（如果需要）

---

## 💡 最可能的问题

根据经验，游标不移动最常见的原因：

1. **忘记选择位置模拟**（模拟器菜单显示 `None`）
   - 解决：选择 `City Run`

2. **没有位置权限**
   - 解决：在 Settings 中授予权限

3. **应用需要按"采集"按钮才显示游标**
   - 解决：按底部的 "GO" 按钮

4. **GPX 文件时间戳是过去的**（已修复）
   - 解决：运行 `npm run update-gpx`

---

## 🎯 现在立即尝试

```bash
# 1. 在模拟器中选择 City Run
# Features → Location → City Run

# 2. 运行应用
npx expo run:ios

# 3. 查看控制台日志
# 应该看到位置更新

# 4. 如果需要，按"采集"按钮
```

如果 City Run 能让游标移动，那就说明位置模拟功能正常，只需要正确配置 GPX 文件即可。
