# Xcode 模擬器 GPX 格式說明

## 三大規定（Checklist）

1. **用 `<wpt>`（Waypoint）**  
   模擬器主要認 `<wpt>` 做路徑模擬，`<trkpt>` 可能只會定點或忽略。

2. **每個點都要有 `<time>`，且為 ISO 8601**  
   結尾要用 **`Z`**（UTC），例如：`2026-01-28T08:42:29Z`。

3. **時間間隔要合理**  
   點與點之間建議 1～5 秒，距離對應走路速度（約 1～5 公尺/點）。

---

## 正確範本（Xcode 用）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SolefoodMVP">
    <wpt lat="22.531548" lon="120.967278">
        <name>起點</name>
        <time>2026-01-28T08:42:29Z</time>
    </wpt>
    <wpt lat="22.531536" lon="120.967250">
        <time>2026-01-28T08:42:32Z</time>
    </wpt>
    <wpt lat="22.531534" lon="120.967278">
        <time>2026-01-28T08:42:34Z</time>
    </wpt>
</gpx>
```

---

## 已修改的檔案

- **`ios/SolefoodMVP/test.gpx`**
  - 已改為全部 `<wpt>`。
  - 每個點都有 `<time>…Z`。
  - 已補齊原本被截斷的最後一個點與 `</gpx>`。

---

## 把 `<trkpt>` 轉成 `<wpt>`

若你有其他 GPX 是 `<trkpt>`，可用：

```bash
python3 ios/trkpt_to_wpt_gpx.py
```

預設會讀取 `ios/SolefoodMVP/28-Jan-2026-1425.gpx`，輸出到 `ios/SolefoodMVP/test.gpx`。

指定檔案：

```bash
python3 ios/trkpt_to_wpt_gpx.py 輸入.gpx 輸出.gpx
```

---

## 時間要「從現在開始」時

若希望一執行就開始動，可先更新時間戳再跑模擬器：

```bash
npm run update-gpx
```

（會改專案內設定的 GPX，若你用的是 `test.gpx`，需在 `update_gpx_time.py` 裡把路徑改成 `test.gpx`，或另寫一隻只更新 `test.gpx` 的腳本。）
