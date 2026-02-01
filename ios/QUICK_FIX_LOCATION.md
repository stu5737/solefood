# 🚨 快速修复：ERR_LOCATION_UNAVAILABLE

## 问题
应用显示 `ERR_LOCATION_UNAVAILABLE` 错误，无法获取位置。

## ⚡ 最快解决方案（30秒）

### 在 iOS 模拟器中直接设置位置：

1. **打开模拟器菜单栏**（模拟器窗口顶部）
2. **点击**：`Features` → `Location` → `Custom Location...`
3. **输入坐标**：
   - **Latitude**: `23.126480`
   - **Longitude**: `121.214800`
4. **点击** `OK`
5. **重新运行应用**或**刷新应用**

---

## 📍 使用 GPX 文件（推荐）

### 步骤：

1. **在 iOS 模拟器菜单栏**：
   - `Features` → `Location` → `GPX File...`

2. **选择 GPX 文件**：
   - 如果看到 `Chishang_10min_Loop`，直接选择
   - 如果没有，点击 `Add GPX File...`
   - 导航到：`SolefoodMVP/Chishang_10min_Loop.gpx`

3. **验证**：
   - 菜单栏应该显示：`Features` → `Location` → `Chishang 10min Loop`（不是 "None"）

4. **重新运行应用**

---

## 🔧 在 Xcode 中永久配置

### 步骤：

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **编辑 Scheme**：
   - 点击顶部 Scheme 下拉菜单（SolefoodMVP 旁边）
   - 选择 `Edit Scheme...`（或按 ⌘<）

3. **配置位置**：
   - 左侧选择 `Run` → `Options`
   - 找到 `Core Location` 部分
   - `Default Location` 下拉菜单：
     - 如果看到 `Chishang 10min Loop`，选择它
     - 如果没有，点击 `Add GPX File to Project...`
     - 选择 `SolefoodMVP/Chishang_10min_Loop.gpx`

4. **保存**：
   - 点击 `Close`

5. **运行应用**：
   ```bash
   npx expo run:ios
   ```

---

## ✅ 验证修复

修复后，控制台应该显示：

```
✅ 位置權限已授予
✅ 初始位置已獲取: { lat: "23.126480", lon: "121.214800", ... }
✅ 位置追蹤已啟動
```

地图应该自动定位到池上车站。

---

## 🐛 如果还是不行

### 检查清单：

- [ ] 模拟器菜单栏：`Features` → `Location` → 不是 "None"
- [ ] 应用权限：`Settings` → `Privacy & Security` → `Location Services` → 应用已启用
- [ ] 重启模拟器
- [ ] 清理构建：在 Xcode 中 `Product` → `Clean Build Folder` (⇧⌘K)

---

## 📞 需要帮助？

如果以上方法都不行，检查控制台输出，应该会显示详细的错误信息和解决建议。
