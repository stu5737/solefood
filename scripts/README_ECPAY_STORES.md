# 綠界 ECPay 門市清單 → 地圖座標（全台便利商店）

官方數據源，每日約 20:00 更新，含門市代碼，適合取貨資訊。

## 前置需求

1. **綠界金流/物流後台**：取得測試或正式環境的 **MerchantID、HashKey、HashIV**。
2. **Mapbox Access Token**：用於地址→經緯度（Geocoding），與地圖同一組即可。

## 環境變數

```bash
export ECPAY_MERCHANT_ID="2000132"        # 測試廠商編號（正式請改為你的）
export ECPAY_HASH_KEY="你的HashKey"
export ECPAY_HASH_IV="你的HashIV"
export MAPBOX_ACCESS_TOKEN="pk.eyJ1..."
```

## 執行

```bash
cd /Users/yumingliao/YML/solefoodmvp
python3 scripts/ecpay_store_list.py
```

- 會呼叫綠界 **GetStoreList**（UNIMART / FAMI / HILIFE / OKMART）。
- 每個門市用 **StoreAddr** 呼叫 Mapbox Geocoding 取得經緯度。
- 輸出：**assets/data/ecpay_convenience_stores.json**（RestaurantPoint[]）。
- 會做距離合併與同格去重，避免地圖上重複點。

## 在 App 使用綠界資料

專案預設載入的是 **taiwan_711_restaurants.json**（Overpass 7-Eleven）。  
若改為使用綠界全台便利商店，在 **app/(tabs)/index.tsx** 的初始化裡，把載入的檔案改為：

`require('../../assets/data/ecpay_convenience_stores.json')`

（或同時載入兩份並合併，依產品需求調整。）

## CheckMacValue 說明

腳本內已實作綠界物流附錄的檢查碼：參數 A–Z 排序 → 前加 HashKey、後加 HashIV → URL encode → 小寫 → **MD5** → 大寫。若綠界日後改版，請對照官方附錄調整。
