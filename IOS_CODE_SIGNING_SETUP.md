# iOS 代碼簽名設置指南

## 問題
當嘗試在實體 iOS 設備上運行應用時，出現錯誤：
```
CommandError: No code signing certificates are available to use.
```

## 解決方案

### 方法 1：使用 Xcode 配置自動簽名（推薦）

1. **打開 Xcode 項目**
   ```bash
   npx expo prebuild
   ```
   這會生成原生 iOS 項目文件。

2. **在 Xcode 中打開項目**
   ```bash
   open ios/solefoodmvp.xcworkspace
   ```
   或
   ```bash
   open ios/solefoodmvp.xcodeproj
   ```

3. **配置代碼簽名**
   - 在 Xcode 中，選擇項目導航器中的項目名稱
   - 選擇 "Signing & Capabilities" 標籤
   - 勾選 "Automatically manage signing"
   - 在 "Team" 下拉選單中選擇您的 Apple Developer 帳號
     - 如果沒有看到您的帳號，點擊 "Add Account..." 並登入您的 Apple ID
   - Xcode 會自動生成並下載所需的證書和配置文件

4. **檢查 Bundle Identifier**
   - 確保 Bundle Identifier 是 `com.solefood.mvp`（與 app.json 中的一致）
   - 如果此 ID 已被使用，您需要更改為唯一的 ID

5. **重新運行**
   ```bash
   npx expo run:ios --device
   ```

### 方法 2：使用 Expo 開發構建（適合開發階段）

如果您有 Expo 帳號，可以使用開發構建：

1. **安裝 EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **登入 Expo**
   ```bash
   eas login
   ```

3. **配置 EAS**
   ```bash
   eas build:configure
   ```

4. **創建開發構建**
   ```bash
   eas build --profile development --platform ios
   ```

5. **安裝到設備**
   構建完成後，EAS 會提供下載連結，您可以在設備上安裝。

### 方法 3：手動配置證書（進階）

如果您需要手動管理證書：

1. **訪問 Apple Developer Portal**
   - 前往 https://developer.apple.com/account
   - 登入您的 Apple Developer 帳號

2. **創建證書**
   - 進入 "Certificates, Identifiers & Profiles"
   - 創建新的開發證書（Development Certificate）

3. **創建 App ID**
   - 確保有 `com.solefood.mvp` 的 App ID

4. **創建配置文件**
   - 創建開發配置文件（Development Provisioning Profile）
   - 關聯您的設備和證書

5. **在 Xcode 中導入**
   - 在 Xcode 中，前往 Preferences > Accounts
   - 選擇您的帳號，點擊 "Download Manual Profiles"

### 常見問題

**Q: 我沒有 Apple Developer 帳號怎麼辦？**
A: 您可以使用免費的 Apple ID 進行開發，但功能會有限制。建議註冊 Apple Developer Program（年費 $99）。

**Q: Bundle Identifier 已被使用怎麼辦？**
A: 在 `app.json` 中更改 `ios.bundleIdentifier` 為唯一的 ID，例如 `com.yourname.solefoodmvp`。

**Q: 如何檢查我的設備是否已註冊？**
A: 在 Xcode 中，Window > Devices and Simulators，查看您的設備是否顯示。

**Q: 可以使用模擬器嗎？**
A: 可以！運行 `npx expo run:ios`（不加 `--device` 參數）會在模擬器中運行，不需要代碼簽名。

## 快速檢查清單

- [ ] 已安裝 Xcode
- [ ] 已在 Xcode 中登入 Apple ID
- [ ] 已運行 `npx expo prebuild` 生成原生項目
- [ ] 已在 Xcode 中配置自動簽名
- [ ] Bundle Identifier 是唯一的
- [ ] 設備已連接到電腦並信任
- [ ] 設備已在 Xcode 中註冊

## 下一步

完成設置後，您應該能夠成功運行：
```bash
npx expo run:ios --device
```

如果仍有問題，請檢查：
- Xcode 控制台的錯誤訊息
- 設備是否已解鎖並信任此電腦
- 網絡連接是否正常（下載證書需要）
