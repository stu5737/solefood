# 🔧 修復：模擬器自動跳到 Custom Location 的問題

## 問題

**模擬器菜單顯示 `✓ Custom Location...`**，導致：
- 位置固定在一個點（不會移動）
- 控制台座標不變：`lat: '22.531586', lon: '120.967189'`（一直相同）
- 游標不動

**原因**：Custom Location 是**固定位置**，不是移動軌跡。

---

## ✅ 解決方案（3 種方法）

### 方法 1：在模擬器菜單中切換（最快）

1. **在 iOS 模擬器菜單欄**：
   - `Features` → `Location`

2. **取消 Custom Location**：
   - 如果看到 `✓ Custom Location...`，點擊它取消選擇
   - 或選擇 `None`

3. **重新運行應用**：
   - 在 Xcode 中按 `⌘R`
   - 或 `npx expo run:ios`

4. **驗證**：
   - 模擬器菜單應該顯示：`Features` → `Location` → `✓ test`（或顯示 Xcode Scheme 中配置的 GPX）
   - 控制台座標應該開始變化

---

### 方法 2：在 Xcode Scheme 中確認配置

1. **打開 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **編輯 Scheme**：
   - `Scheme` → `Edit Scheme...`（或 `⌘<`）
   - `Run` → `Options`

3. **確認 GPX 配置**：
   - `Core Location` → `Default Location`
   - **應該選擇 `test`**（不是 `Custom Location` 或 `None`）

4. **如果看不到 `test`**：
   - 點擊 `Add GPX File...`
   - 選擇 `SolefoodMVP/test.gpx`
   - 點擊 `Open`

5. **保存並運行**：
   - `Close` → 在 Xcode 中按 `⌘R`

---

### 方法 3：強制重置模擬器位置設置

1. **完全關閉模擬器**

2. **重新打開 Xcode 並運行**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   # 在 Xcode 中按 ⌘R
   ```

3. **檢查模擬器菜單**：
   - `Features` → `Location`
   - 應該顯示 `✓ test`（如果 Xcode Scheme 配置正確）

---

## 🔍 為什麼會自動跳到 Custom Location？

### 可能原因

1. **之前手動設置過 Custom Location**：
   - 模擬器會記住最後的設置
   - 即使 Xcode Scheme 配置了 GPX，模擬器可能還是使用 Custom Location

2. **Xcode Scheme 配置沒有生效**：
   - 如果從命令行運行（`npx expo run:ios`），可能不會使用 Scheme 的 GPX 設置
   - **必須從 Xcode 運行**才能使用 Scheme 的 GPX

3. **test.gpx 沒有正確添加到項目**：
   - 如果 test.gpx 不在 Xcode 項目中，Scheme 的配置可能無效

---

## 📋 完整檢查清單

### 檢查 1：Xcode Scheme 配置

- [ ] `Scheme` → `Edit Scheme...` → `Run` → `Options`
- [ ] `Core Location` → `Default Location` = **`test`**
- [ ] 不是 `None`、`Custom Location` 或其他選項

### 檢查 2：模擬器菜單

- [ ] `Features` → `Location` → 應該顯示 `✓ test`
- [ ] **不能是** `✓ Custom Location...` 或 `None`

### 檢查 3：控制台日誌

- [ ] 應該看到 `[Location Update] 📍 位置更新`
- [ ] **座標應該在變化**（lat 和 lon 應該不同）
- [ ] 如果座標一直相同 → 說明還是 Custom Location（固定位置）

### 檢查 4：test.gpx 在項目中

- [ ] Xcode 項目導航器中應該看到 `test.gpx`（有 GPX 圖標）
- [ ] 文件路徑：`SolefoodMVP/test.gpx`

---

## 🎯 推薦流程

### 步驟 1：在模擬器中取消 Custom Location

1. 模擬器菜單：`Features` → `Location` → 點擊 `Custom Location...` 取消
2. 或選擇 `None`

### 步驟 2：在 Xcode 中確認並運行

1. 打開 Xcode：`open ios/SolefoodMVP.xcworkspace`
2. 確認 Scheme：`Scheme` → `Edit Scheme...` → `Run` → `Options` → `Default Location` = `test`
3. 運行：按 `⌘R`

### 步驟 3：驗證

1. 模擬器菜單：`Features` → `Location` → 應該顯示 `✓ test`
2. 控制台：座標應該開始變化
3. 地圖：游標應該開始移動

---

## 💡 重要提示

### Custom Location vs GPX 文件

| 設置 | 行為 | 用途 |
|------|------|------|
| **Custom Location** | 固定位置（不移動） | 測試固定位置功能 |
| **GPX 文件** | 移動軌跡（會動） | 測試移動和軌跡 |

**要讓游標移動，必須使用 GPX 文件，不能使用 Custom Location！**

---

## 🚨 如果還是不動

### 檢查控制台座標是否變化

**如果座標一直相同**：
```
[Location Update] 📍 位置更新: { lat: '22.531586', lon: '120.967189', ... }
[Location Update] 📍 位置更新: { lat: '22.531586', lon: '120.967189', ... }  ← 相同！
```

**說明**：還是 Custom Location（固定位置）

**解決**：
1. 在模擬器菜單中取消 Custom Location
2. 選擇 `None` 或 `test`（如果能看到）

**如果座標在變化**：
```
[Location Update] 📍 位置更新: { lat: '22.531586', lon: '120.967189', ... }
[Location Update] 📍 位置更新: { lat: '22.531536', lon: '120.967250', ... }  ← 不同！
```

**說明**：位置在更新，但游標可能沒有跟隨

**解決**：檢查 Camera 跟隨邏輯（我們已經添加了，可能需要檢查是否生效）

---

## ✅ 現在立即執行

```bash
# 1. 在模擬器菜單中
# Features → Location → 取消 Custom Location（選擇 None）

# 2. 在 Xcode 中確認
open ios/SolefoodMVP.xcworkspace
# Scheme → Edit Scheme... → Run → Options → Default Location = test

# 3. 運行
# 在 Xcode 中按 ⌘R
```

**關鍵**：必須取消 Custom Location，讓 Xcode Scheme 的 test.gpx 配置生效！
