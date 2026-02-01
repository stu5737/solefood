# 修复 Xcode 中的问号 (?) 标记

## 问题
Xcode 项目导航器中，`Chishang_10min_Loop` 旁边显示问号 (?)，表示文件引用有问题。

## ✅ 已修复

我已经修复了以下问题：

1. **删除重复的文件引用** - 之前有两个不同的 UUID 引用同一个文件
2. **统一文件引用** - 现在只使用一个正确的引用 `EAAAA7BB32B44EEF8515019A`
3. **修复文件类型** - 将文件类型从 `text.xml` 改为 `text`

## 🔄 下一步操作

### 在 Xcode 中刷新项目：

1. **关闭 Xcode**（如果正在运行）

2. **重新打开项目**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

3. **检查项目导航器**：
   - `Chishang_10min_Loop.gpx` 应该不再显示问号
   - 应该显示为正常的文件图标

4. **如果还有问号**：
   - 在 Xcode 中，右键点击 `Chishang_10min_Loop.gpx`
   - 选择 `Delete` → `Remove Reference`（不要选择 `Move to Trash`）
   - 然后重新添加文件：
     - 右键点击 `SolefoodMVP` 文件夹
     - `Add Files to "SolefoodMVP"...`
     - 选择 `SolefoodMVP/Chishang_10min_Loop.gpx`
     - ✅ 勾选 `Copy items if needed`
     - ✅ 勾选 `Add to targets: SolefoodMVP`
     - 点击 `Add`

---

## 📋 验证

修复后，Xcode 项目导航器应该显示：

- ✅ `Chishang_10min_Loop.gpx` - 正常文件图标（无问号）
- ✅ `SolefoodMVP` - 项目图标（可能有 "M" 表示已修改，这是正常的）
- ✅ `Pods` - 正常显示

---

## 🎯 如果问号仍然存在

### 方法 1：清理 Derived Data

1. **在 Xcode 中**：
   - `Xcode` → `Settings` → `Locations`
   - 点击 `Derived Data` 路径旁边的箭头
   - 删除 `SolefoodMVP-*` 文件夹

2. **重新打开项目**

### 方法 2：重新添加文件

1. **删除引用**（不删除文件）：
   - 在 Xcode 中，右键点击 `Chishang_10min_Loop.gpx`
   - `Delete` → `Remove Reference`

2. **重新添加**：
   - 右键点击 `SolefoodMVP` 文件夹
   - `Add Files to "SolefoodMVP"...`
   - 选择文件并添加

---

## 💡 说明

问号 (?) 通常表示：
- 文件引用路径不正确
- 文件不存在于指定位置
- 文件类型识别错误
- 项目文件配置损坏

我已经修复了配置问题，重新打开 Xcode 后应该就正常了。
