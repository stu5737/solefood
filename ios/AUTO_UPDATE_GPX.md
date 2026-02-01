# 🚀 自动更新 GPX 时间戳的 3 种方法

## 问题

GPX 文件的时间戳是固定的，如果是过去的时间，iOS 模拟器不会播放轨迹。每次手动更新太麻烦。

---

## ✅ 方法 1：使用 npm 脚本（推荐）

### 运行应用（自动更新 GPX）

```bash
npm run ios:gpx
```

**这个命令会自动**：
1. 更新 GPX 时间戳为当前时间
2. 运行应用

### 只更新 GPX 时间戳

```bash
npm run update-gpx
```

然后在 Xcode 中手动运行应用（`⌘R`）

---

## ✅ 方法 2：使用 Shell 脚本

```bash
./ios/run-with-gpx.sh
```

**这个脚本会自动**：
1. 更新 GPX 时间戳
2. 清理构建缓存
3. 运行应用

---

## ✅ 方法 3：在 Xcode 中添加 Pre-action Script

这样每次在 Xcode 中运行应用时，都会自动更新 GPX 时间戳。

### 步骤：

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **编辑 Scheme**：
   - 点击顶部 Scheme 下拉菜单 → `Edit Scheme...`（或 `⌘<`）

3. **添加 Pre-action**：
   - 左侧选择 `Run`
   - 点击 `Pre-actions` 左边的小三角展开
   - 点击底部的 `+` 号 → `New Run Script Action`

4. **输入脚本**：
   ```bash
   cd "${SRCROOT}/.."
   python3 ios/update_gpx_time.py
   ```

5. **选择 Target**：
   - 在 `Provide build settings from` 下拉菜单中
   - 选择 `SolefoodMVP`

6. **保存**：
   - 点击 `Close`

### 验证

在 Xcode 中按 `⌘R` 运行应用时，会先看到：
```
🔧 正在更新 GPX 文件时间戳...
✅ 已更新 372 个时间点
```

然后应用才会启动。

---

## 📝 使用建议

### 日常开发（推荐方法 1）

```bash
npm run ios:gpx
```

- 最简单
- 一个命令搞定
- 适合命令行用户

### 在 Xcode 中开发（推荐方法 3）

设置 Pre-action Script 后：
- 在 Xcode 中按 `⌘R` 就会自动更新
- 不需要记住任何命令
- 适合习惯用 Xcode 的用户

### 偶尔测试 GPX

```bash
npm run update-gpx
```

只更新时间戳，不运行应用。

---

## 🔧 其他解决方案

### 方案 A：创建一个"永远有效"的 GPX 文件

使用未来很久的时间（比如 2030 年），这样几年内都不需要更新。

**缺点**：iOS 可能不接受太未来的时间。

### 方案 B：使用 Custom Location 代替 GPX

在模拟器中使用 `Custom Location` 设置固定位置，适合测试基本功能。

**缺点**：无法测试移动轨迹。

### 方案 C：使用真机测试

在真机上运行，使用真实 GPS。

**缺点**：需要真的到处走。

---

## 💡 推荐工作流程

### 初始设置（一次性）

在 Xcode 中添加 Pre-action Script（方法 3）

### 日常使用

**如果习惯命令行**：
```bash
npm run ios:gpx
```

**如果习惯 Xcode**：
- 在 Xcode 中按 `⌘R`
- Pre-action 会自动更新 GPX 时间戳

### 快速测试

```bash
npm run update-gpx  # 只更新 GPX
```

然后在 Xcode 中运行。

---

## 🎯 总结

| 方法 | 命令 | 优点 | 适合人群 |
|------|------|------|----------|
| **npm 脚本** | `npm run ios:gpx` | 简单，一条命令 | 命令行用户 |
| **Shell 脚本** | `./ios/run-with-gpx.sh` | 可以清理缓存 | 喜欢自定义 |
| **Xcode Pre-action** | 在 Xcode 中按 `⌘R` | 完全自动化 | Xcode 用户 |

**推荐**：
- 命令行用户 → 方法 1（npm 脚本）
- Xcode 用户 → 方法 3（Pre-action）

---

## 📋 快速参考

```bash
# 自动更新 GPX 并运行应用
npm run ios:gpx

# 只更新 GPX 时间戳
npm run update-gpx

# 使用 Shell 脚本
./ios/run-with-gpx.sh

# 普通运行（不更新 GPX）
npm run ios
```

**现在不需要每次都手动更新时间戳了！** 🎉
