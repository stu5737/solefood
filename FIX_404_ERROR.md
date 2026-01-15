# 🔧 修復 HTTP 404 錯誤

## ❌ 當前錯誤

```
[3D Model] ❌ 模型註冊失敗: Error: HTTP 404: 無法訪問 URL
```

**原因**：GitHub Raw URL 返回 404

---

## 🔍 診斷清單

### 檢查 1：倉庫是否公開？

**問題**：如果倉庫是私有的，Raw URL 無法訪問

**解決**：
1. 打開 https://github.com/stu5737/solefood
2. 點擊 **Settings**
3. 滾動到最底部 **Danger Zone**
4. 點擊 **Change visibility** → **Make public**

---

### 檢查 2：文件是否存在？

**驗證步驟**：
1. 打開 https://github.com/stu5737/solefood
2. 導航到 `assets/models/`
3. 確認 `user-avator.glb` 存在

**如果文件不存在**，需要上傳：

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 檢查 git 遠程倉庫
git remote -v

# 如果是 solefood 倉庫，添加並推送
git add assets/models/user-avator.glb
git commit -m "Add 3D avatar model"
git push origin main
```

---

### 檢查 3：分支名稱正確嗎？

**當前 URL 使用**：`main`

**可能需要**：`master`

**檢查分支名稱**：

```bash
cd /Users/yumingliao/YML/solefoodmvp
git branch -r
```

**如果是 master 分支**，URL 應該是：
```
https://raw.githubusercontent.com/stu5737/solefood/master/assets/models/user-avator.glb
```

---

## ✅ 快速解決方案

### 方案 A：使用當前專案的倉庫

如果 `solefoodmvp` 和 `solefood` 是不同的倉庫：

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 檢查當前倉庫
git remote get-url origin

# 上傳到當前倉庫
git add assets/models/user-avator.glb
git commit -m "Add 3D avatar model"
git push

# 然後使用對應的 URL
```

---

### 方案 B：使用測試 GLB（立即可用）

使用公開的測試模型先驗證功能：

**Khronos 官方測試模型**：
```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
```

我可以修改代碼使用這個測試 URL。

---

### 方案 C：暫時回退到箭頭

繼續使用原來的箭頭游標，等解決 GitHub 問題後再啟用 3D。

---

## 🎯 推薦步驟

### 1. 確認倉庫狀態

在瀏覽器打開：
```
https://github.com/stu5737/solefood
```

檢查：
- [ ] 倉庫是否公開？
- [ ] 文件是否存在於 `assets/models/user-avator.glb`？
- [ ] 分支是 `main` 還是 `master`？

---

### 2. 如果倉庫是私有的

兩個選擇：

**A. 設為公開**（簡單）
- Settings → Danger Zone → Change visibility → Make public

**B. 使用其他方案**
- 上傳到公開的圖床/CDN
- 使用 Cloudinary 等服務

---

### 3. 如果文件不存在

上傳文件到 GitHub：

```bash
cd /Users/yumingliao/YML/solefoodmvp
git add assets/models/user-avator.glb
git commit -m "Add 3D avatar model"
git push origin main  # 或 master
```

等待 1-2 分鐘讓 GitHub CDN 更新。

---

### 4. 如果分支名稱錯誤

修改代碼中的 URL：

```typescript
// 如果是 master 分支
const glbUrl = 'https://raw.githubusercontent.com/stu5737/solefood/master/assets/models/user-avator.glb';
```

---

## 🔧 臨時測試方案

如果你想立即測試 3D 模型功能，我可以改用官方測試模型：

```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
```

這個 URL 保證可用，可以先驗證 3D 功能是否正常工作。

---

## 💬 需要我幫忙嗎？

請告訴我：

1. **你的 GitHub 倉庫是公開的嗎？**
2. **文件已經在 GitHub 上了嗎？**
3. **分支是 main 還是 master？**

或者你想：
- **A.** 先用測試模型驗證功能
- **B.** 回退到箭頭游標
- **C.** 我會自己解決 GitHub 問題

---

## 📋 完整 URL 格式

```
https://raw.githubusercontent.com/[用戶名]/[倉庫名]/[分支]/[文件路徑]
                                  ↓        ↓        ↓           ↓
https://raw.githubusercontent.com/stu5737/solefood/main/assets/models/user-avator.glb
```

確保每個部分都正確！
