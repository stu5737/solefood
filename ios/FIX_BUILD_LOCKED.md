# 🔧 修复 "database is locked" 错误

## 错误信息

```
error: unable to attach DB: database is locked
Possibly there are two concurrent builds running in the same filesystem location.
```

## 原因

有两个构建进程同时运行（通常是 Xcode 和命令行同时构建）。

---

## ⚡ 立即修复（3 个步骤）

### 步骤 1：杀死所有构建进程

```bash
killall -9 xcodebuild Xcode
```

### 步骤 2：清理 DerivedData

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/SolefoodMVP-*
```

### 步骤 3：重新运行

```bash
npm run ios:gpx
```

---

## 📋 完整的修复脚本

一条命令搞定：

```bash
killall -9 xcodebuild Xcode 2>/dev/null; rm -rf ~/Library/Developer/Xcode/DerivedData/SolefoodMVP-*; npm run ios:gpx
```

---

## 💡 如何避免这个问题

### 方法 1：只使用命令行

**不要同时在 Xcode 中按 Run 和在终端运行命令。**

选择一种方式：
- **方式 A**：只用命令行 → `npm run ios:gpx`
- **方式 B**：只用 Xcode → 在 Xcode 中按 `⌘R`

### 方法 2：等待构建完成

如果正在构建，等待构建完成后再运行另一个构建。

### 方法 3：关闭 Xcode

如果使用命令行构建：
1. 关闭 Xcode
2. 运行 `npm run ios:gpx`

---

## 🚨 常见错误场景

### 场景 1：在 Xcode 中构建时，又运行命令

```bash
# Xcode 正在构建...
npm run ios:gpx  # ❌ 会导致错误
```

**解决**：等待 Xcode 构建完成，或者先杀死 Xcode 构建。

### 场景 2：同时运行多个 npm 命令

```bash
npm run ios:gpx &  # 后台运行
npm run ios:gpx    # ❌ 又运行一次，会冲突
```

**解决**：只运行一个命令。

---

## 📝 推荐工作流程

### 使用命令行开发

```bash
# 1. 确保 Xcode 没有在构建
# 2. 运行命令
npm run ios:gpx

# 3. 如果遇到错误，先清理
killall -9 xcodebuild Xcode 2>/dev/null
rm -rf ~/Library/Developer/Xcode/DerivedData/SolefoodMVP-*

# 4. 重新运行
npm run ios:gpx
```

### 使用 Xcode 开发

```bash
# 1. 打开 Xcode
open ios/SolefoodMVP.xcworkspace

# 2. 在 Xcode 中按 ⌘R 运行
# 不要在终端运行 npm run ios
```

---

## 🔍 其他可能的原因

### 原因 1：Xcode 崩溃但进程仍在运行

**症状**：Xcode 已关闭，但构建进程还在后台运行。

**解决**：
```bash
killall -9 xcodebuild
```

### 原因 2：DerivedData 损坏

**症状**：即使杀死进程，错误仍然出现。

**解决**：
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### 原因 3：磁盘空间不足

**症状**：构建过程中磁盘空间不足。

**解决**：
```bash
# 检查磁盘空间
df -h

# 清理 DerivedData（可以释放几 GB）
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

---

## ✅ 验证修复

运行以下命令检查是否还有构建进程：

```bash
ps aux | grep xcodebuild
```

**如果没有输出**（或只有 grep 自己），说明没有构建进程在运行。

---

## 🎯 现在立即执行

```bash
# 一条命令修复并重新运行
killall -9 xcodebuild Xcode 2>/dev/null; rm -rf ~/Library/Developer/Xcode/DerivedData/SolefoodMVP-*; npm run ios:gpx
```

这会：
1. ✅ 杀死所有 Xcode 构建进程
2. ✅ 清理 DerivedData
3. ✅ 自动更新 GPX 时间戳
4. ✅ 重新构建并运行应用
