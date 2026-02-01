# 修复 GPX 文件不移动的问题

## 问题
已经导入了 GPX 文件 `28-Jan-2026-1425.gpx`，但应用没有按照 GPX 轨迹移动。

## 🔍 可能的原因

### 1. GPX 文件时间间隔问题
iOS 模拟器按照 GPX 文件中的 `<time>` 标签来移动位置。如果时间间隔设置不合理，可能导致：
- 移动太快（时间间隔太短）
- 移动太慢（时间间隔太长）
- 不移动（时间格式错误）

### 2. 位置更新配置问题
应用的 `watchPositionAsync` 配置可能太严格：
- `distanceInterval: 1` - 每 1 米才更新，如果 GPX 点之间距离较远可能不会触发
- `timeInterval: 1000` - 每 1 秒检查一次

### 3. GPX 文件格式问题
GPX 文件可能缺少必要的时间标签或格式不正确。

---

## ✅ 解决方案

### 方法 1：检查 GPX 文件格式

确保 GPX 文件包含正确的时间标签：

```xml
<trkpt lat="23.126480" lon="121.214800">
  <ele>265</ele>
  <time>2026-01-28T14:25:00Z</time>  <!-- ✅ 必须有时间标签 -->
</trkpt>
```

**时间格式要求**：
- 必须是 ISO 8601 格式：`YYYY-MM-DDTHH:MM:SSZ`
- 每个点都必须有时间标签
- 时间应该是递增的

---

### 方法 2：调整位置更新配置

如果 GPX 点之间距离较远，需要调整 `distanceInterval`：

**当前配置**（可能太严格）：
```typescript
distanceInterval: 1,  // 每 1 米才更新
```

**建议配置**（更宽松）：
```typescript
distanceInterval: 0,  // 不限制距离，只按时间更新
// 或者
distanceInterval: 5,  // 每 5 米更新（如果点之间距离较远）
```

---

### 方法 3：验证模拟器位置设置

1. **检查模拟器菜单**：
   - `Features` → `Location` → 应该显示您选择的 GPX 文件名称
   - 确保不是 "None" 或 "Custom Location"

2. **检查位置是否在更新**：
   - 在应用控制台查看位置更新日志
   - 应该看到：`✅ 初始位置已獲取`
   - 应该看到位置坐标在变化

3. **如果位置固定不变**：
   - 可能是 GPX 文件只有一个点
   - 或者时间标签格式错误
   - 或者模拟器没有正确加载 GPX 文件

---

### 方法 4：添加 GPX 文件到 Xcode 项目

如果 GPX 文件是通过模拟器菜单临时导入的，需要添加到 Xcode 项目才能永久使用：

1. **将 GPX 文件复制到项目**：
   ```bash
   # 找到您的 GPX 文件位置
   # 复制到项目目录
   cp /path/to/28-Jan-2026-1425.gpx ios/SolefoodMVP/
   ```

2. **在 Xcode 中添加**：
   - 右键点击 `SolefoodMVP` 文件夹
   - `Add Files to "SolefoodMVP"...`
   - 选择 `28-Jan-2026-1425.gpx`
   - ✅ 勾选 `Copy items if needed`
   - ✅ 勾选 `Add to targets: SolefoodMVP`
   - 点击 `Add`

3. **配置 Scheme**：
   - `Scheme` → `Edit Scheme...`
   - `Run` → `Options` → `Core Location`
   - `Default Location` → 选择 `28-Jan-2026-1425`

---

## 🔧 调试步骤

### 步骤 1：检查位置是否在更新

查看应用控制台，应该看到：
```
✅ 初始位置已獲取: { lat: "...", lon: "..." }
```

如果位置坐标一直不变，说明模拟器没有按照 GPX 移动。

### 步骤 2：检查 GPX 文件内容

打开 GPX 文件，检查：
- 是否有多个 `<trkpt>` 点？
- 每个点是否有 `<time>` 标签？
- 时间格式是否正确？
- 时间是否递增？

### 步骤 3：验证模拟器设置

在模拟器菜单栏：
- `Features` → `Location` → 应该显示 GPX 文件名称
- 如果不是，重新选择 GPX 文件

### 步骤 4：检查应用日志

查看是否有位置更新：
```
[Heading] 🏃 移動中，更新運動方向: ...
```

如果没有，可能是：
- GPX 点之间距离太远，没有触发 `distanceInterval`
- 需要调整位置更新配置

---

## 💡 快速修复

### 如果 GPX 文件时间间隔太长（移动太慢）：

修改 GPX 文件，缩短时间间隔：
```xml
<!-- 原来：间隔 2 分钟 -->
<trkpt lat="..." lon="...">
  <time>2026-01-28T14:25:00Z</time>
</trkpt>
<trkpt lat="..." lon="...">
  <time>2026-01-28T14:27:00Z</time>  <!-- 2分钟后 -->
</trkpt>

<!-- 修改为：间隔 10 秒 -->
<trkpt lat="..." lon="...">
  <time>2026-01-28T14:25:00Z</time>
</trkpt>
<trkpt lat="..." lon="...">
  <time>2026-01-28T14:25:10Z</time>  <!-- 10秒后 -->
</trkpt>
```

### 如果应用不接收位置更新：

调整 `distanceInterval` 为 0（不限制距离）：
```typescript
subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 0,  // ✅ 改为 0，不限制距离
  },
  ...
);
```

---

## 📝 需要的信息

为了进一步诊断，请提供：

1. **GPX 文件位置**：文件在哪里？
2. **GPX 文件内容**：可以分享前几个点的内容吗？
3. **控制台日志**：应用启动后，位置坐标是否有变化？
4. **模拟器设置**：`Features` → `Location` → 显示什么？
