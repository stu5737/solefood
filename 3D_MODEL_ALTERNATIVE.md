# 🎮 3D 模型替代方案

## ⚠️ 當前狀態

**問題**：Metro bundler 無法通過 `require()` 加載 GLB 文件  
**臨時方案**：已禁用 3D 模型，使用原來的箭頭游標 ✅

---

## 🔍 問題分析

### 為什麼 require() 失敗？

1. **React Native 限制**：`require()` 主要用於圖片、字體等標準資源
2. **GLB 是二進制文件**：需要特殊處理
3. **Metro 配置不夠**：僅添加 `assetExts` 不足以處理複雜的二進制文件

---

## ✅ 3 個可行的替代方案

### 方案 A：使用網絡 URL（推薦 ⭐⭐⭐⭐⭐）

將 GLB 文件上傳到 CDN 或服務器，使用 HTTP URL 加載。

#### 優點
- ✅ 最簡單可靠
- ✅ 不受 Metro bundler 限制
- ✅ 可隨時更新模型
- ✅ 不增加應用大小

#### 實施步驟

1. **上傳 GLB 到服務器**
   - GitHub Release
   - AWS S3
   - Cloudinary
   - 任何支持直接連結的服務

2. **修改代碼**
   ```typescript
   // 在 MapboxRealTimeMap.tsx 中
   try {
     const glbUrl = 'https://your-cdn.com/user-avator.glb';
     console.log('[3D Model] 📦 從 URL 加載模型:', glbUrl);
     
     // 直接使用 URL 註冊模型
     await mapRef.current.addModel('user-avatar-model', glbUrl);
     
     setIs3DModelReady(true);
     console.log('[3D Model] ✅ 3D 模型註冊成功！');
   } catch (error) {
     console.error('[3D Model] ❌ 模型註冊失敗:', error);
   }
   ```

3. **免費 CDN 選項**
   - GitHub: `https://raw.githubusercontent.com/你的用戶名/倉庫名/main/user-avator.glb`
   - Cloudinary: 免費 25GB
   - Backblaze B2: 前 10GB 免費

---

### 方案 B：使用 expo-file-system（中等難度 ⭐⭐⭐）

將 GLB 文件複製到應用文件系統，然後加載。

#### 優點
- ✅ 離線可用
- ✅ 本地文件

#### 缺點
- ⚠️ 需要額外步驟
- ⚠️ 增加應用大小

#### 實施步驟

1. **安裝依賴**
   ```bash
   npx expo install expo-file-system
   ```

2. **修改代碼**
   ```typescript
   import * as FileSystem from 'expo-file-system';
   
   try {
     // 1. 先用 Asset 下載到緩存
     const asset = Asset.fromModule(require('../../assets/models/user-avator.glb'));
     await asset.downloadAsync();
     
     // 2. 複製到文件系統
     const localUri = `${FileSystem.documentDirectory}user-avator.glb`;
     await FileSystem.copyAsync({
       from: asset.localUri,
       to: localUri
     });
     
     // 3. 使用 file:// URI 註冊
     await mapRef.current.addModel('user-avatar-model', localUri);
     
     setIs3DModelReady(true);
   } catch (error) {
     console.error('[3D Model] ❌ 失敗:', error);
   }
   ```

---

### 方案 C：Base64 編碼（不推薦 ⭐）

將 GLB 轉換為 Base64，內嵌到代碼中。

#### 缺點
- ❌ 文件太大（3.8 MB → ~5 MB Base64）
- ❌ 影響應用性能
- ❌ 代碼體積暴增

**不建議使用**

---

## 🎯 推薦實施順序

### 1. 立即方案：使用箭頭游標（當前 ✅）

應用已恢復正常，使用原來的 `➤` 箭頭游標。

### 2. 短期方案：上傳到 GitHub（1 小時）

最簡單的方式：

```bash
# 1. 創建 GitHub 倉庫（如果沒有）
# 2. 上傳 GLB 文件
git add assets/models/user-avator.glb
git commit -m "Add 3D avatar model"
git push

# 3. 獲取 Raw URL
# https://raw.githubusercontent.com/你的用戶名/solefoodmvp/main/assets/models/user-avator.glb
```

然後修改代碼使用這個 URL。

### 3. 長期方案：專業 CDN（可選）

如果需要更好的性能和管理：
- AWS S3 + CloudFront
- Cloudinary
- Vercel Blob Storage

---

## 💡 臨時測試方案

如果只是想快速測試 3D 模型效果，可以使用公開的測試 GLB：

```typescript
// 使用公開的測試模型
const testGlbUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';

await mapRef.current.addModel('user-avatar-model', testGlbUrl);
```

---

## 📋 下一步建議

### 選項 1：繼續使用箭頭（簡單）

當前方案已經很好，箭頭游標清晰明確。

### 選項 2：實施方案 A（1 小時）

上傳 GLB 到 GitHub，使用 URL 加載。

### 選項 3：研究其他問題

3D 模型不是核心功能，可以先優化其他部分。

---

## 🔧 需要我幫忙嗎？

如果你想實施方案 A（GitHub URL），我可以：

1. ✅ 修改代碼使用 URL
2. ✅ 添加錯誤處理
3. ✅ 測試和驗證

只需提供 GLB 的 GitHub Raw URL 即可！

---

## 📊 功能對比

| 特性 | 箭頭游標 | 3D 模型 |
|------|---------|---------|
| **性能** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **文件大小** | <1KB | 3.8MB |
| **加載速度** | 即時 | 2-5秒 |
| **視覺效果** | 清晰 | 更真實 |
| **維護成本** | 低 | 中 |

**當前選擇：箭頭游標** ✅

足夠清晰，性能優秀，無需額外處理。
