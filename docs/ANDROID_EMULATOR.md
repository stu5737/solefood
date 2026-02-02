# 加開 Android 模擬器

方便在電腦上多開一個 Android 模擬器，專門測 Android bug（與 iOS 模擬器或實機並行測試）。

---

## 事前準備

- 已安裝 **Android Studio**，並完成初次設定（會下載 SDK）。
- 終端機已設定 `ANDROID_HOME` 與 `emulator` 路徑（見 [RUN_ON_ANDROID.md](./RUN_ON_ANDROID.md) 方法一）。

確認：

```bash
echo $ANDROID_HOME
# 應顯示：/Users/你的用戶名/Library/Android/sdk

emulator -list-avds
# 列出已有模擬器（若為空代表還沒建立任何 AVD）
```

---

## 方式一：用 Android Studio 建立並啟動（推薦）

### 1. 建立新模擬器（若還沒有）

1. 開啟 **Android Studio**。
2. 右上角 **More Actions** → **Virtual Device Manager**（或選單 **Tools** → **Device Manager**）。
3. 點 **Create Device**。
4. 選一支手機，例如 **Pixel 6** 或 **Pixel 7** → **Next**。
5. 選系統映像：
   - 建議 **API 34**（Android 14）或 **API 33**（Android 13）。
   - 旁邊標籤選 **x86_64**（Mac 用 **arm64-v8a** 若有的話更快）。
   - 若該版本旁顯示 **Download**，點下去下載完再選 → **Next**。
6. 可改 AVD 名稱（或維持預設）→ **Finish**。

### 2. 啟動模擬器

- 在 **Device Manager** 裡，找到剛建立的模擬器，點右側 **▶** 啟動。
- 等模擬器開到桌面後，再在專案跑 App。

### 3. 在專案跑 App 到模擬器

專案根目錄執行（**不要**加 `--device`，才會裝到模擬器）：

```bash
cd /path/to/solefoodmvp
npx expo start
# 另開一個終端機：
npx expo run:android
```

未接實機時，會自動選已開啟的模擬器並安裝 App。

---

## 方式二：用指令列建立與啟動

適合已有 SDK、想用終端機操作時。

### 1. 看有哪些系統映像

```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --list | grep system-images
```

或先裝好一個映像（例如 API 34）：

```bash
# 列出可安裝的
sdkmanager --list

# 安裝 API 34 映像（Mac M 系列可選 arm64-v8a）
sdkmanager "system-images;android-34;google_apis;arm64-v8a"
# 若為 Intel Mac 用：
# sdkmanager "system-images;android-34;google_apis;x86_64"
```

### 2. 建立 AVD

```bash
# 語法：avdmanager create avd -n <名稱> -k "system-images;android-<API>;google_apis;<abi>"
$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_6_API_34 -k "system-images;android-34;google_apis;arm64-v8a" -d "pixel_6"
```

出現 `Do you wish to create a custom hardware profile?` 可選 **no**。

### 3. 列出所有 AVD

```bash
emulator -list-avds
```

### 4. 從指令列啟動模擬器

```bash
# 用 AVD 名稱啟動（背景執行）
emulator -avd Pixel_6_API_34 &

# 或直接指定上面 list 出來的其中一個名稱
emulator -avd 你的AVD名稱
```

### 5. 跑 App

模擬器開好後，在專案目錄：

```bash
npx expo run:android
```

---

## 快速對照

| 要做的事           | 指令／操作 |
|--------------------|------------|
| 列出已有模擬器     | `emulator -list-avds` |
| 啟動某個模擬器     | `emulator -avd 名稱` 或 Device Manager 點 ▶ |
| 只裝到模擬器（不接實機） | 先開模擬器，再 `npx expo run:android` |
| 接實機時指定用實機 | `npx expo run:android --device` |

---

## 與 iOS 模擬器／實機同時測

- **Metro** 只要開一個：`npx expo start`。
- 先開 **Android 模擬器**，再執行 `npx expo run:android`，App 會裝到模擬器並連到同一個 Metro。
- iOS 可同時開模擬器或實機，用同一個 Metro 即可。  
多裝置並行測試可參考 [RUN_MULTIPLE_DEVICES.md](./RUN_MULTIPLE_DEVICES.md)。
