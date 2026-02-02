# 同時測三台：iOS 實機 + Android 實機 + iOS 模擬器

同一份 Metro 服務，讓 **iOS 實機**、**Android 實機**、**iOS 模擬器** 一起連線開發。

---

## 1. 先開 Metro（只開一次）

在專案根目錄開**第一個終端機**，執行：

```bash
cd /path/to/solefoodmvp
npx expo start
```

**不要關**，讓它一直跑。之後三台裝置都吃這一個 Metro。

---

## 2. iOS 模擬器

### 第一次（建置並安裝）

在**第二個終端機**：

```bash
cd /path/to/solefoodmvp
npx expo run:ios
```

會建置並在**預設 iOS 模擬器**上安裝 App、啟動。模擬器裡的 App 會連 `localhost:8081`，不用額外設定。

### 之後（模擬器已裝好 App）

只要 Metro 有開，在模擬器裡**直接點 App** 即可，不用再跑 `expo run:ios`。

### 想指定模擬器型號

```bash
npx expo run:ios --simulator "iPhone 16"
```

可用 `xcrun simctl list devices` 看有哪些模擬器名稱。

---

## 3. iOS 實機（iPhone）

### 第一次：建置並裝到手機

1. iPhone 用 **USB 接 Mac**（或同 Wi‑Fi 無線除錯）。
2. 在**第三個終端機**：

   ```bash
   cd /path/to/solefoodmvp
   npx expo run:ios --device
   ```

3. 若有超過一台裝置，終端機會要你選 **iPhone 實機**（不要選 Simulator）。
4. 建置完成後 App 會裝到 iPhone 並啟動。

### 讓實機連到 Metro（重要）

實機**不能**用 `localhost:8081`（那是手機自己），要改連**電腦的 IP**。

1. **查電腦 IP**（Mac）：
   ```bash
   ipconfig getifaddr en0
   ```
   記下數字，例如 `192.168.1.100`。

2. **在 iPhone 上**：
   - 打開 **Solefood MVP** App。
   - **搖晃手機** → 開發者選單。
   - 點 **Settings** → **Debug server host & port for device**。
   - 輸入：`你的電腦IP:8081`（例如 `192.168.1.100:8081`）。
   - 儲存後再搖晃 → 選 **Reload**。

3. **電腦與 iPhone 要在同一個 Wi‑Fi**，否則連不到 Metro。

之後只要 Metro 有開、Wi‑Fi 同網段，iPhone 點 App 就會連到同一個 Metro。

---

## 4. Android 實機

### 第一次：建置並裝到手機

1. Android 手機用 **USB 接電腦**，並開啟 **USB 偵錯**。
2. 在**第四個終端機**（或和 iOS 實機共用一個終端機，錯開時間）：

   ```bash
   cd /path/to/solefoodmvp
   adb reverse tcp:8081 tcp:8081
   npx expo run:android --device
   ```

3. 建置完成後 App 會裝到 Android 並啟動；`adb reverse` 讓手機的 `localhost:8081` 指到電腦的 Metro。

### 之後（Android 已裝好 App）

1. Metro 保持運行（步驟 1）。
2. 手機 USB 接電腦，執行一次：
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. 在手機上**直接點 App** 即可。

拔線後若要用 Wi‑Fi 連 Metro，請參考 [RUN_ON_ANDROID.md](./RUN_ON_ANDROID.md) 的「拔線後用 Wi‑Fi 連 Metro」。

---

## 5. 建議操作順序（同時測三台）

| 步驟 | 動作 |
|------|------|
| 1 | 開 **終端機 1**：`npx expo start`，不關。 |
| 2 | 開 **終端機 2**：`npx expo run:ios` → 跑起 **iOS 模擬器**。 |
| 3 | 開 **終端機 3**：`npx expo run:ios --device` → 裝到 **iPhone 實機**。 |
| 4 | 在 **iPhone** 上設 Debug server host = `電腦IP:8081`，Reload。 |
| 5 | 開 **終端機 4**：`adb reverse tcp:8081 tcp:8081`，再 `npx expo run:android --device` → 裝到 **Android 實機**。 |

之後日常測試：

- **只開 Metro**（終端機 1）。
- **iOS 模擬器**：直接點 App。
- **iPhone**：同 Wi‑Fi，直接點 App（已設過 Debug server host 的話）。
- **Android**：USB 接電腦 → `adb reverse tcp:8081 tcp:8081` → 點 App。

三台會共用同一個 JS bundle，改程式存檔後三台都會熱更新（若熱更新有開）。

---

## 6. 常見問題

### 選錯裝置（例如選到模擬器而不是實機）

- iOS：`npx expo run:ios --device` 後在列表選名字是 **iPhone** 的那台（不是 Simulator）。
- Android：`npx expo run:android --device` 後選你的手機型號；可先用 `adb devices` 確認裝置列表。

### iPhone 實機紅畫面／Unable to load script

- 確認 **Debug server host** 設成 `電腦IP:8081`（搖晃 → Settings）。
- 確認電腦與 iPhone **同一個 Wi‑Fi**。
- 確認 **Metro 有在跑**（終端機 1 沒關）。

### Android 實機紅畫面／Unable to load script

- 再執行一次：`adb reverse tcp:8081 tcp:8081`（每次重插 USB 或重開機後建議再跑一次）。
- 確認 **Metro 有在跑**。

### 想用同一台電腦 IP 給多台實機

- 所有實機（iOS / Android）都設或使用 **同一個電腦 IP:8081** 即可，Metro 一個就夠。

---

## 7. 指令整理

| 目的 | 指令 |
|------|------|
| 開 Metro（必做一次，保持運行） | `npx expo start` |
| 建置並跑 iOS 模擬器 | `npx expo run:ios` |
| 建置並裝到 iPhone 實機 | `npx expo run:ios --device` |
| Android 實機連 Metro（USB） | `adb reverse tcp:8081 tcp:8081` |
| 建置並裝到 Android 實機 | `npx expo run:android --device` |
| 查電腦 IP（Mac） | `ipconfig getifaddr en0` |
