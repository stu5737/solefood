# 🎯 使用 test.gpx 的完整步驟

## 問題

City Run 能讓游標跟著動，但 test.gpx 不行。

**原因**：test.gpx 還沒被 Xcode 或模擬器選中。

---

## ✅ 完整流程（3 步驟）

### 步驟 1：更新 test.gpx 時間戳

```bash
npm run update-test
```

或

```bash
python3 ios/update_test_gpx.py
```

**確認輸出**：
- 應該顯示「✅ 已更新 7 個時間點」
- 新時間應該是「從現在開始」

---

### 步驟 2：在 Xcode 中選擇 test.gpx

1. **打開 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **編輯 Scheme**：
   - 點擊頂部 Scheme 下拉菜單 → `Edit Scheme...`（或按 `⌘<`）

3. **選擇 GPX 文件**：
   - 左側選擇 `Run` → `Options`
   - 找到 `Core Location` 部分
   - 點擊 `Default Location` 下拉菜單
   - **選擇 `test`**（應該會看到這個選項）

4. **如果看不到 `test`**：
   - 點擊 `Add GPX File...`
   - 導航到：`SolefoodMVP/test.gpx`
   - 選擇文件並點擊 `Open`

5. **保存**：
   - 點擊 `Close` 保存

---

### 步驟 3：運行應用

**在 Xcode 中**：
- 按 `⌘R` 運行

**或在命令行**：
```bash
npm run ios:test
```

這個命令會：
1. 自動更新 test.gpx 時間戳
2. 運行應用

---

## 🔍 驗證

### 檢查 1：模擬器位置設置

在模擬器菜單栏：
- `Features` → `Location`
- 應該顯示 `✓ test`（或其他選中的 GPX）
- **不能是 `None` 或 `City Run`**

---

### 檢查 2：控制台日志

應該看到：
```
✅ 初始位置已獲取: { lat: "22.531548", lon: "120.967278", ... }
[Location Update] 📍 位置更新: { lat: "22.531536", lon: "120.967250", ... }
[Location Update] 📍 位置更新: { lat: "22.531534", lon: "120.967278", ... }
```

**重要**：`lat` 和 `lon` 應該在**變化**（對應 test.gpx 的 7 個點）。

---

### 檢查 3：地圖顯示

- 游標應該在高雄市（22.531°N, 120.967°E）
- 游標應該在 7 個點之間移動
- 每個點間隔約 3 秒

---

## 📋 test.gpx 當前信息

- **坐標點數**：7 個
- **位置**：高雄市
- **時間間隔**：每 3 秒一個點
- **總時長**：約 18 秒（很短）
- **格式**：`<wpt>`（Xcode 標準格式）

---

## 💡 如果還是不動

### 問題 1：時間戳又過期了

test.gpx 只有 7 個點，18 秒就播完了。如果你更新時間戳後等太久才運行，時間又會過期。

**解決**：
```bash
# 更新時間戳後立即運行
npm run update-test && npx expo run:ios
```

---

### 問題 2：模擬器沒有選擇 test.gpx

**檢查**：
- 模擬器菜單：`Features` → `Location`
- 應該顯示 `✓ test`

**如果顯示 `City Run` 或其他**：
- 選擇 `test`（如果有這個選項）
- 如果沒有，在 Xcode Scheme 中配置（參考步驟 2）

---

### 問題 3：test.gpx 點太少，移動太快

test.gpx 只有 7 個點，每 3 秒一個，總共 18 秒就播完。你可能沒注意到移動就結束了。

**解決 A：使用更多點的 GPX**：
```bash
# 把 28-Jan-2026-1425.gpx（372 個點）轉成 wpt 格式
python3 ios/trkpt_to_wpt_gpx.py ios/28-Jan-2026-1425.gpx ios/SolefoodMVP/test.gpx

# 更新時間戳
npm run update-test

# 運行應用
npx expo run:ios
```

**解決 B：讓 test.gpx 循環播放**：
- 在模擬器菜單中，選擇 test.gpx 後，它會一直循環播放
- 所以即使只有 7 個點，也會反覆播放

---

## 🎯 推薦做法

### 快速測試（使用 test.gpx）

```bash
# 1. 更新時間戳並運行
npm run ios:test

# 2. 確認模擬器位置設置為 test
# Features → Location → ✓ test

# 3. 觀察游標在 18 秒內移動 7 個點
```

### 長時間測試（使用 28-Jan GPX）

```bash
# 1. 轉換 28-Jan 為 wpt 格式
python3 ios/trkpt_to_wpt_gpx.py ios/28-Jan-2026-1425.gpx ios/SolefoodMVP/test.gpx

# 2. 更新時間戳並運行
npm run ios:test

# 3. 游標會移動約 14 分鐘（372 個點）
```

---

## 📝 快速參考

```bash
# 更新 test.gpx 時間戳
npm run update-test

# 更新時間戳並運行應用
npm run ios:test

# 把 trkpt GPX 轉成 wpt 格式（for Xcode）
python3 ios/trkpt_to_wpt_gpx.py 輸入.gpx 輸出.gpx
```

---

## ✅ 總結

**City Run 能動 = 你的 App 沒問題！**

test.gpx 不動是因為：
1. 時間戳過期（已提供 `npm run update-test`）
2. 沒有在 Xcode 或模擬器中選擇 test.gpx
3. test.gpx 只有 7 個點，播放太快（18 秒）

**現在執行**：
```bash
npm run update-test  # 更新時間戳
```

然後在 Xcode Scheme 或模擬器菜單中選擇 `test`，重新運行應用，游標就會跟著 test.gpx 移動了。
