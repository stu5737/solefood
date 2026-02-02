# Android 背景定位錯誤：「Foreground service cannot be started when in background」

## 錯誤訊息

```
Call to function "ExpoLocation.startLocationUpdatesAsync" has been rejected.
→ Caused by: Couldn't start the foreground service.
Foreground service cannot be started when the application is in the background
```

或錯誤代碼：`ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED`。

## 原因

- Android 規定：**只有 App 在前景時**才能啟動「前台服務」。
- expo-location 在 Android 上若啟用了前台服務，呼叫 `startLocationUpdatesAsync` 時原生層會嘗試啟動前台服務；若當時系統判定 App 在背景，就會 reject 並印出上述錯誤。
- 該紅字是**原生／bridge 在 reject 時印的**，我們的 JS `catch` 無法關閉那第一行 Console Error。

## 解法（從根本消除錯誤）

本專案已將 **app.json** 設為 **`isAndroidForegroundServiceEnabled: false`**，原生專案必須**重新產生**才會套用，否則仍會嘗試啟動前台服務並觸發錯誤。

**請依序執行：**

```bash
npx expo prebuild --clean
npx expo run:android
```

- `prebuild --clean`：依 app.json 重新產生 `android/`，套用 `isAndroidForegroundServiceEnabled: false`。
- `run:android`：建置並安裝到裝置／模擬器。

完成後再點「開始採集」，該 Console Error 應會消失；Android 上改為僅前台模式（App 開啟時記錄），不再嘗試啟動前台服務。

## 若已執行 prebuild 仍出現錯誤

1. 確認 **app.json** 裡 expo-location plugin 為：`"isAndroidForegroundServiceEnabled": false`。
2. 刪除 **android/** 資料夾後再執行一次 `npx expo prebuild --clean`，再 `npx expo run:android`。
3. 確認是執行 **run:android 裝的 App** 在測（不是舊的 APK 或別台未重裝的裝置）。

## 程式端已做的處理

- JS 不傳 `foregroundService` 給 Android。
- 外層 catch 辨識此錯誤時只打一則 warn、不洗紅字，並回傳 `false`。
- 若仍看到一則紅字，多半是原生層在 reject 時印的，需依上方步驟重做 prebuild 並重裝才會消失。
