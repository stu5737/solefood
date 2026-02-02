# 在 Android 上執行 Solefood MVP

## 兩種方式

| 方式 | 優點 | 限制 |
|------|------|------|
| **原生建置（實機／模擬器）** | 功能完整（Mapbox、定位、背景等） | 需安裝 Android Studio |
| **Expo Go** | 不用裝 Android Studio、最快 | 部分原生模組不支援，本專案建議用原生建置 |

**建議**：要完整跑地圖與定位，請用 **方法一（原生建置）**。

---

## 方法一：原生建置到實機 Android（建議）

### 事前準備

- **電腦**：Mac 或 Windows
- **Android Studio**：已安裝並完成初次設定（會自動下載 Android SDK）
- **Android 手機**：用 USB 接電腦，並開啟「開發人員選項」與「USB 偵錯」

### 1. 安裝 Android Studio 與 SDK

1. 下載：<https://developer.android.com/studio>
2. 安裝後開啟，完成設定精靈（會下載 SDK）。
3. 設定環境變數（終端機用得到）：

   **Mac（zsh）**：編輯 `~/.zshrc`，加入：

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

   儲存後執行：`source ~/.zshrc`

   **Windows**：系統環境變數新增 `ANDROID_HOME` = `C:\Users\你的用戶名\AppData\Local\Android\Sdk`，並把 `platform-tools` 加入 PATH。

### 2. 在 Android 手機上開啟 USB 偵錯

1. **設定** → **關於手機** → 連點 **版本號碼** 約 7 次，開啟「開發人員選項」。
2. 回到 **設定** → **系統**（或 **進階**）→ **開發人員選項**。
3. 開啟 **USB 偵錯**。
4. 用傳輸線接上電腦，手機會跳出「允許 USB 偵錯嗎？」→ 勾選「一律允許」後點 **允許**。

### 3. 確認裝置已連上

```bash
adb devices
```

若有列出你的裝置（例如 `XXXXXXXX device`）就代表連線成功。

### 4. 建置並安裝到手機（務必先開 Metro）

**重要**：實機透過 USB 連線時，手機上的 App 會向「本機 8081」要 JS，必須用 `adb reverse` 轉到電腦的 Metro。

**步驟 A：先開 Metro（第一個終端機）**

```bash
cd /path/to/solefoodmvp
npx expo start
```

保持這個終端機開著，等出現 Metro 畫面（QR Code 等）。

**步驟 B：USB 轉埠（第二個終端機，手機已用 USB 接電腦）**

```bash
adb reverse tcp:8081 tcp:8081
```

**步驟 C：建置並安裝到手機（同一個第二終端機）**

```bash
cd /path/to/solefoodmvp
npm install
npx expo run:android --device
```

- 若只接一台裝置，會自動選那台。
- 第一次建置會較久（幾分鐘），完成後 App 會自動裝到手機並連到 Metro 載入 JS。

**若 App 已裝好、只是打不開／紅畫面**：只要確保 Metro 在跑（步驟 A），並再執行一次 `adb reverse tcp:8081 tcp:8081`（步驟 B），然後在手機上重新開啟 App。

### 5. 之後再跑

手機接好 → 同目錄執行：

```bash
npm run android
```

或：

```bash
npx expo run:android --device
```

---

## 拔線後用 Wi‑Fi 連 Metro（不插線也能跑）

用 USB 時是靠 `adb reverse` 讓手機的 8081 指到電腦；**拔線後**要改讓 App 直接連電腦的 IP。

### 步驟

1. **電腦與手機連同一個 Wi‑Fi**（同一個路由器）。

2. **電腦上 Metro 保持開著**：
   ```bash
   npx expo start
   ```

3. **查電腦的 IP**（Mac）：
   ```bash
   ipconfig getifaddr en0
   ```
   會得到類似 `192.168.1.100`（記下來）。  
   Windows：`ipconfig`，看「無線區域連線」的 IPv4。

4. **在手機上改 Metro 位址**：
   - 打開 Solefood MVP App
   - **搖晃手機** → 出現開發者選單
   - 點 **Settings**（或「設定」）
   - 找到 **Debug server host & port for device**
   - 輸入：`你的電腦IP:8081`（例如 `192.168.1.100:8081`）
   - 儲存／確定

5. **重新載入**：
   - 再搖晃手機 → 選 **Reload**（或從多工關掉 App 再開一次）

之後只要電腦 Metro 有開、手機和電腦同 Wi‑Fi，**不用插 USB** 也能正常用 App。下次開 App 若又紅畫面，再搖晃 → Reload 即可。

---

## 方法二：Android 模擬器

**詳細步驟**（建立／指令列啟動／多裝置並測）見 **[ANDROID_EMULATOR.md](./ANDROID_EMULATOR.md)**。

### 1. 在 Android Studio 建立模擬器

1. 開啟 Android Studio → **More Actions** 或 **Tools** → **Device Manager**。
2. **Create Device** → 選一支手機（例如 Pixel 6）→ **Next**。
3. 選一個系統映像（例如 API 34），沒有就點 **Download** 下載 → **Next** → **Finish**。

### 2. 啟動模擬器並跑 App

1. 在 Device Manager 裡點模擬器旁的 **▶** 啟動。
2. 在專案根目錄執行：

   ```bash
   npx expo run:android
   ```

   未加 `--device` 時會優先裝到已開啟的模擬器。

---

## 方法三：Expo Go（快速試跑，功能可能不完整）

若只想先看畫面、不要求地圖／定位完整：

1. 在 Android 手機從 **Google Play** 安裝 **Expo Go**。
2. 電腦與手機連同一個 Wi‑Fi。
3. 專案根目錄執行：

   ```bash
   npx expo start
   ```

4. 手機打開 Expo Go，掃描終端機顯示的 QR Code。

**注意**：本專案使用 Mapbox、背景定位等原生模組，Expo Go 可能無法完整支援，若地圖或定位異常，請改用 **方法一** 原生建置。

---

## 常見問題

### 「Unable to load script」／紅畫面／無法連到 Metro

代表手機上的 App 連不到電腦的 Metro bundler。

**1. 先確認 Metro 有在跑**

在專案根目錄開一個終端機：

```bash
npx expo start
```

不要關掉，讓它一直跑。

**2. USB 實機：做 port 轉發**

手機用 **USB 接電腦** 時，再開一個終端機執行：

```bash
adb reverse tcp:8081 tcp:8081
```

（每次重新插 USB 或重開機後，若又出現無法載入，再執行一次。）

**3. 用手機重新打開 App**

從多工關掉 Solefood MVP 再開一次，或按 App 內「Reload」。

**4. 拔線後想用 Wi‑Fi 連 Metro（不用插線）**

- 電腦與手機**同一個 Wi‑Fi**。
- 電腦上 Metro 保持運行：`npx expo start`。
- 查電腦 IP（Mac 終端機）：`ipconfig getifaddr en0`（或 `ifconfig` 看 Wi‑Fi 的 inet）。
- 在**手機**上：打開 App → **搖晃手機** → 開發者選單 → **Settings** → **Debug server host & port for device** → 輸入 `電腦IP:8081`（例如 `192.168.1.100:8081`）→ 確定。
- 再搖晃一次 → 選 **Reload**。之後在同一個 Wi‑Fi 下拔掉 USB 也能正常載入。

---

### 找不到 `adb` 或 `ANDROID_HOME`

- 確認已安裝 Android Studio 並完成第一次設定。
- 確認環境變數已設好並重新開終端機（或 `source ~/.zshrc`）。

### `adb devices` 沒有裝置

- 換一條傳輸線（需支援資料傳輸）。
- 手機上再確認「USB 偵錯」已開，並重新插線、允許偵錯。
- Windows 若有需要，可安裝手機廠商的 USB 驅動。

### 建置失敗：SDK 或 Gradle 錯誤

- 在專案目錄執行：`cd android && ./gradlew clean && cd ..`，再執行 `npx expo run:android --device`。
- 確認 Android Studio 的 **SDK Manager** 裡已安裝 **Android SDK Platform**（例如 API 33 或 34）與 **Build-Tools**。

### 要打包成 APK 給別人裝

- Debug APK（僅供測試）：建置完成後，APK 通常在  
  `android/app/build/outputs/apk/debug/app-debug.apk`  
  可複製到手機安裝。
- 正式上架請使用 **EAS Build** 或 Android Studio 的 **Generate Signed Bundle / APK** 產生簽署後的版本。

---

## 指令整理

| 目的 | 指令 |
|------|------|
| 跑在已接的實機 | `npx expo run:android --device` |
| 跑在模擬器 | 先開模擬器，再執行 `npx expo run:android` |
| 使用 package.json 腳本 | `npm run android` |
| 只開 Metro，不建置 | `npx expo start` |
