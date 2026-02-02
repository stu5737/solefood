#!/usr/bin/env bash
# 在已連接的 Android 實機或模擬器上建置並執行
cd "$(dirname "$0")"
npx expo run:android --device
