# 修复 react-native-reanimated Worklets 版本不匹配

## 错误信息
```
[WorkletsError: [Worklets] Mismatch between JavaScript part and native part of Worklets (0.7.1 vs 0.5.1).
```

## 原因
原生代码中的 `react-native-reanimated` 版本与 JavaScript 版本不匹配。这通常发生在：
1. 原生代码没有重新构建
2. 缓存问题
3. Pod 依赖未更新

## 解决方案

### 方案 1：清理并重新构建 iOS（推荐）

```bash
# 1. 停止所有运行中的进程
# 在终端按 Ctrl+C

# 2. 清理 iOS 构建缓存
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
cd ..

# 3. 清理 Expo 缓存
npx expo start --clear

# 4. 重新安装 Pods
cd ios
pod install
cd ..

# 5. 清理 Xcode 构建缓存
rm -rf ~/Library/Developer/Xcode/DerivedData

# 6. 重新构建
npx expo run:ios --no-build-cache
```

### 方案 2：使用 Expo 的清理命令

```bash
# 清理所有缓存
npx expo start --clear

# 如果使用 Expo Go，重新安装应用
# 如果使用原生构建，运行：
npx expo run:ios --clean
```

### 方案 3：完全重置（如果上述方法无效）

```bash
# 1. 删除 node_modules 和锁定文件
rm -rf node_modules package-lock.json

# 2. 清理 iOS
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
cd ..

# 3. 清理 Android（如果存在）
cd android
./gradlew clean
cd ..

# 4. 重新安装依赖
npm install

# 5. 重新安装 Pods
cd ios
pod install
cd ..

# 6. 清理所有缓存
npx expo start --clear

# 7. 重新构建
npx expo run:ios
```

## 验证修复

运行应用后，错误应该消失。如果仍然出现，请检查：

1. **Babel 配置**：确保 `babel.config.js` 包含 `react-native-reanimated/plugin`
2. **Pod 版本**：检查 `ios/Podfile.lock` 中的 `React-Core` 和 `RCT-Folly` 版本
3. **Node 版本**：确保使用兼容的 Node.js 版本（推荐 18.x 或 20.x）

## 预防措施

1. 在更新 `react-native-reanimated` 后，总是重新构建原生代码
2. 使用 `--no-build-cache` 标志来确保完全重新构建
3. 定期清理 Xcode DerivedData：`rm -rf ~/Library/Developer/Xcode/DerivedData`
