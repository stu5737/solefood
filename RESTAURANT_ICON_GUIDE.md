# 🍽️ 餐厅图标开发指南

## ✅ GPX 文件已准备好

City Run GPX 文件已生成：
- **文件位置**：`ios/SolefoodMVP/CityRun_Loop.gpx`
- **路线**：台北 101 附近 1 公里循环
- **时长**：约 10 分钟
- **坐标点数**：60 个

---

## 🎯 开始开发餐厅图标

### 步骤 1：在 Xcode 中添加 GPX 文件（如果还没有）

1. **打开 Xcode**：
   ```bash
   open ios/SolefoodMVP.xcworkspace
   ```

2. **添加 GPX 文件**：
   - 在项目导航器中，右键点击 `SolefoodMVP` 文件夹
   - `Add Files to "SolefoodMVP"...`
   - 选择 `CityRun_Loop.gpx`
   - 确保勾选 `Add to targets: SolefoodMVP`
   - 点击 `Add`

3. **配置 Scheme**：
   - `Scheme` → `Edit Scheme...` → `Run` → `Options`
   - `Core Location` → `Default Location` → 选择 `City Run Loop`

---

## 🍽️ 餐厅图标开发

### 设计需求

根据您的应用风格（可爱 Q 版 + 极简），餐厅图标应该：

1. **风格**：
   - 3D 立体感（与火焰、推车图标一致）
   - 可爱 Q 版
   - 简洁明了

2. **尺寸**：
   - 与现有图标保持一致（约 32-48px）
   - 支持 @2x 和 @3x 分辨率

3. **颜色**：
   - 与整体 UI 配色协调
   - 可能需要与地图上的标记颜色匹配

---

## 📁 图标文件位置

### 建议的文件结构

```
assets/
  images/
    restaurant_icon.png          # 基础图标
    restaurant_icon@2x.png       # 2x 分辨率
    restaurant_icon@3x.png       # 3x 分辨率
```

或者使用 SVG（如果支持）：
```
assets/
  images/
    restaurant_icon.svg
```

---

## 🎨 图标设计建议

### 选项 1：餐具图标
- 🍴 叉子和刀子
- 🥢 筷子
- 🍽️ 盘子

### 选项 2：餐厅建筑
- 🏪 小房子/建筑
- 🏬 商店图标
- 🏘️ 餐厅建筑

### 选项 3：食物相关
- 🍜 碗/盘子
- 🍱 便当盒
- 🥘 锅子

### 选项 4：地图标记风格
- 📍 带餐厅标识的图钉
- 🗺️ 地图上的标记点

---

## 💻 代码集成

### 在 MapboxRealTimeMap 中添加餐厅标记

```typescript
// 示例：在地图上显示餐厅图标
<Mapbox.PointAnnotation
  id="restaurant-1"
  coordinate={[121.5654, 25.0330]} // 台北 101 附近
>
  <Image
    source={require('@/assets/images/restaurant_icon.png')}
    style={{ width: 32, height: 32 }}
  />
</Mapbox.PointAnnotation>
```

### 在 HUD 中显示餐厅信息

```typescript
// 示例：在 TopHUD 中添加餐厅图标
<View style={styles.restaurantInfo}>
  <Image
    source={require('@/assets/images/restaurant_icon.png')}
    style={styles.restaurantIcon}
  />
  <Text style={styles.restaurantCount}>3</Text>
</View>
```

---

## 📋 开发检查清单

### 图标准备
- [ ] 设计餐厅图标（3D、Q 版风格）
- [ ] 导出 @1x, @2x, @3x 分辨率
- [ ] 保存到 `assets/images/` 目录

### 代码集成
- [ ] 在地图上添加餐厅标记点
- [ ] 实现餐厅数据管理（位置、名称等）
- [ ] 添加点击餐厅的交互功能
- [ ] 在 HUD 中显示餐厅信息（如果需要）

### 测试
- [ ] 使用 City Run GPX 测试地图显示
- [ ] 测试餐厅图标在不同缩放级别下的显示
- [ ] 测试点击餐厅的交互
- [ ] 测试餐厅图标的性能（大量餐厅时）

---

## 🎯 下一步行动

1. **设计图标**：
   - 使用 Figma、Sketch 或其他设计工具
   - 参考现有的火焰和推车图标风格
   - 确保 3D 立体感和可爱 Q 版风格

2. **导出图标**：
   - 导出为 PNG（@1x, @2x, @3x）
   - 或使用 SVG（如果 React Native 支持）

3. **集成到应用**：
   - 添加到 `assets/images/`
   - 在代码中引用
   - 在地图上显示

4. **测试**：
   - 使用 City Run GPX 测试
   - 确保图标显示正确
   - 测试交互功能

---

## 💡 提示

### 图标设计工具
- **Figma**：免费，在线协作
- **Sketch**：Mac 专用
- **Adobe Illustrator**：专业矢量图
- **Canva**：简单快速

### 图标生成工具
- **IconKitchen**：快速生成多分辨率图标
- **AppIcon.co**：在线图标生成器

### 图标资源
- **Flaticon**：免费图标库
- **Icons8**：图标和插图
- **The Noun Project**：图标库

---

## 📝 相关文件

- GPX 文件：`ios/SolefoodMVP/CityRun_Loop.gpx`
- 地图组件：`src/components/map/MapboxRealTimeMap.tsx`
- HUD 组件：`src/components/game-hud/GameOverlay.tsx`
- 图标目录：`assets/images/`

---

## 🚀 开始吧！

现在您可以：
1. ✅ 使用 City Run GPX 测试地图功能
2. 🎨 设计餐厅图标
3. 💻 集成到应用中
4. 🧪 测试功能

**祝开发顺利！** 🎉
