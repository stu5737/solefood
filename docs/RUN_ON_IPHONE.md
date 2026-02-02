# 在實機 iPhone 上執行 Solefood MVP

## 事前準備

- **Mac**（已安裝 Xcode）
- **iPhone**（用傳輸線連到 Mac，或同一個 Apple ID 的無線除錯）
- **Apple ID**（免費即可，用來簽署 App）

---

## 方法一：用 Xcode 跑在實機（建議）

### 1. 用 Xcode 開啟專案

在專案根目錄執行：

```bash
open ios/SolefoodMVP.xcworkspace
```

**注意**：要開 `.xcworkspace`，不要開 `.xcodeproj`。

### 2. 選你的 iPhone 當目標裝置

- 在 Xcode 上方工具列，點 **裝置選擇器**（預設可能是某個模擬器）
- 在列表裡選 **你的 iPhone 名稱**（例如 "John 的 iPhone"）
- 若沒看到 iPhone：
  - 確認傳輸線已接好，iPhone 已解鎖
  - 若跳出「要信任這台電腦嗎？」請在 iPhone 上點 **信任**
  - 再等幾秒讓 Xcode 辨識裝置

### 3. 設定簽署（Signing）

1. 左側專案導覽點 **SolefoodMVP**（藍色圖示）
2. 中間選 **TARGETS** → **SolefoodMVP**
3. 上方點 **Signing & Capabilities**
4. 勾選 **Automatically manage signing**
5. **Team** 選你的 Apple ID：
   - 若沒有：點 **Add Account...** → 登入 Apple ID
   - 用免費帳號會顯示 "Personal Team"
6. 若出現 **Bundle Identifier** 衝突（已被別人用過）：
   - 把 **Bundle Identifier** 改成唯一的，例如：`com.solefood.mvp.yourname`

### 4. 在 iPhone 上信任開發者（第一次必做）

1. 在 Mac 上按 **▶️ 執行**（或 `⌘R`）
2. 若建置成功，iPhone 會裝上 App，但可能顯示「未受信任的開發者」
3. 在 **iPhone** 上：
   - 開啟 **設定** → **一般** → **VPN 與裝置管理**（或 **描述檔與裝置管理**）
   - 在「開發者 APP」裡點你的 **Apple ID / 開發者名稱**
   - 點 **信任 "xxx"** → 再確認 **信任**
4. 回到 iPhone 主畫面，點 **Solefood MVP** 圖示即可開啟

### 5. 之後再跑

- iPhone 接好（或無線已連好）
- Xcode 選你的 iPhone → 按 **▶️** 執行

---

## 方法二：用指令列跑在實機

### 1. 接好 iPhone

- 傳輸線連接 Mac 與 iPhone
- iPhone 解鎖，若有「信任這台電腦」請點信任

### 2. 執行指令

在專案根目錄：

```bash
npm install
npx expo run:ios --device
```

- 若只接一台 iPhone，會自動選那台
- 若有多台裝置，終端機會要你選一個編號

### 3. 第一次在 iPhone 上信任開發者

同 **方法一** 的「步驟 4」：到 **設定 → 一般 → VPN 與裝置管理** 信任你的開發者帳號。

---

## 常見問題

### 看不到我的 iPhone

- 換一條傳輸線或換一個 USB 孔
- iPhone 解鎖並保持在主畫面
- Xcode 選單 **Window** → **Devices and Simulators** 看裝置是否出現、是否顯示「Preparing...」

### 建置失敗：簽署錯誤

- 到 **Signing & Capabilities** 確認 **Team** 有選
- 把 **Bundle Identifier** 改成唯一值（例如加你的英文名）

### 建置失敗：憑證或描述檔錯誤

- 用 **Automatically manage signing**，讓 Xcode 自己產生憑證與描述檔
- 若仍失敗，可到 [Apple Developer](https://developer.apple.com/account) 檢查是否有免費帳號限制（例如同一時間可安裝的裝置數量）

### App 裝了但打不開／閃退

- 確認已在 **設定 → 一般 → VPN 與裝置管理** 信任開發者
- 若有用到定位：第一次開啟時在 iPhone 上允許「總是允許」或「使用 App 期間」定位權限

---

## 無線除錯（選用）

1. iPhone 用傳輸線接 Mac，在 Xcode 跑過一次成功
2. Xcode 選單 **Window** → **Devices and Simulators**
3. 左側選你的 iPhone，勾選 **Connect via network**
4. 之後同一 Wi‑Fi 下可拔線，在裝置列表仍會看到你的 iPhone，可直接選它執行
