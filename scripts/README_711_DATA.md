# 全台 7-Eleven 座標資料（Overpass API）

## 步驟一：抓取原始資料

腳本使用 Python 內建 `urllib`，**不需安裝 pip / requests**。

```bash
python3 scripts/fetch_711_taiwan.py
```

- 輸出：`scripts/taiwan_711_full.json`（約 5–8MB）
- 耗時：約 10–30 秒

## 步驟二：轉成 App 餐廳格式

```bash
python3 scripts/overpass_to_restaurants.py
```

- 輸入：`scripts/taiwan_711_full.json`
- 輸出：`assets/data/taiwan_711_restaurants.json`（RestaurantPoint[]）
- App 啟動時會自動載入此檔；GPS 距離 ≤ 20m 可卸貨／拍照

## 一次執行

```bash
python3 scripts/fetch_711_taiwan.py && python3 scripts/overpass_to_restaurants.py
```

完成後重新啟動 App（或重新載入）即可看到地圖上的 7-Eleven 標註。
