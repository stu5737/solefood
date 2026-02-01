#!/usr/bin/env python3
"""
綠界 ECPay 門市清單 API → 經緯度（Mapbox Geocoding）→ App 餐廳格式
輸出: assets/data/ecpay_convenience_stores.json（RestaurantPoint[]）

需設定環境變數（或改下方預設）：
  ECPAY_MERCHANT_ID   - 綠界廠商編號（測試：2000132）
  ECPAY_HASH_KEY      - 綠界 HashKey（向綠界索取）
  ECPAY_HASH_IV       - 綠界 HashIV（向綠界索取）
  MAPBOX_ACCESS_TOKEN - Mapbox token（用於地址→經緯度）

執行: python3 scripts/ecpay_store_list.py
依賴: 無（Python 內建 urllib, hashlib）
"""

import hashlib
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request

# 綠界 API（測試環境）
ECPAY_GET_STORE_LIST_URL = "https://logistics-stage.ecpay.com.tw/Helper/GetStoreList"
# 預設測試廠商編號（正式請改為你的 MerchantID）
ECPAY_MERCHANT_ID = os.environ.get("ECPAY_MERCHANT_ID", "2000132")
ECPAY_HASH_KEY = os.environ.get("ECPAY_HASH_KEY", "5294y06JbISpM5x9")
ECPAY_HASH_IV = os.environ.get("ECPAY_HASH_IV", "v77hoKGq4kWxNNIS")
# 超商類別：UNIMART=7-ELEVEN, FAMI=全家, HILIFE=萊爾富, OKMART=OK
CVS_TYPES = ["UNIMART", "FAMI", "HILIFE", "OKMART"]
CVS_EMOJI = {"UNIMART": "🥤", "FAMI": "🏪", "HILIFE": "🏪", "OKMART": "🏪"}

MAPBOX_ACCESS_TOKEN = os.environ.get("MAPBOX_ACCESS_TOKEN", "pk.eyJ1Ijoic3R1NTczNyIsImEiOiJjbDNnZTdqdGswcWFtM2NreWVsanAwM2EyIn0.uSN5Ylk5k1Zl3MwkH8HKTw")
MAPBOX_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"

MERGE_RADIUS_M = 30
GRID_DECIMALS = 5


def check_mac_value(params: dict, hash_key: str, hash_iv: str) -> str:
    """
    綠界物流檢查碼（附錄）：參數 A-Z 排序 → HashKey+串+HashIV → URL encode → 小寫 → MD5 → 大寫
    """
    sorted_keys = sorted(params.keys())
    pair_str = "&".join(f"{k}={params[k]}" for k in sorted_keys)
    to_encode = f"HashKey={hash_key}&{pair_str}&HashIV={hash_iv}"
    encoded = urllib.parse.quote(to_encode, safe="")
    encoded_lower = encoded.lower()
    md5_hex = hashlib.md5(encoded_lower.encode("utf-8")).hexdigest()
    return md5_hex.upper()


def fetch_ecpay_store_list(cvs_type: str) -> list:
    """呼叫綠界 GetStoreList，回傳該超商類別的 StoreInfo 列表"""
    if not ECPAY_HASH_KEY or not ECPAY_HASH_IV:
        print("請設定 ECPAY_HASH_KEY 與 ECPAY_HASH_IV 環境變數（向綠界索取）")
        return []
    params = {"MerchantID": ECPAY_MERCHANT_ID, "CvsType": cvs_type}
    params["CheckMacValue"] = check_mac_value(params, ECPAY_HASH_KEY, ECPAY_HASH_IV)
    body = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        ECPAY_GET_STORE_LIST_URL,
        data=body.encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("RtnCode") != 1:
        print(f"綠界 API 錯誤 {cvs_type}: {data.get('RtnMsg', '')}")
        return []
    out = []
    for item in data.get("StoreList", []):
        if item.get("CvsType") != cvs_type:
            continue
        for info in item.get("StoreInfo", []):
            out.append({
                "StoreId": info.get("StoreId", ""),
                "StoreName": info.get("StoreName", ""),
                "StoreAddr": info.get("StoreAddr", ""),
                "StorePhone": info.get("StorePhone", ""),
                "CvsType": cvs_type,
            })
    return out


def geocode_address(address: str) -> tuple:
    """Mapbox Geocoding：台灣地址 → (lat, lon)，失敗回傳 (None, None)"""
    if not MAPBOX_ACCESS_TOKEN:
        return None, None
    q = urllib.parse.quote(address)
    url = f"{MAPBOX_GEOCODE_URL.format(query=q)}?access_token={MAPBOX_ACCESS_TOKEN}&country=TW&limit=1"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        features = data.get("features", [])
        if not features:
            return None, None
        lon, lat = features[0].get("center", [None, None])
        return lat, lon
    except Exception:
        return None, None


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    out_dir = os.path.join(root, "assets", "data")
    out_path = os.path.join(out_dir, "ecpay_convenience_stores.json")
    os.makedirs(out_dir, exist_ok=True)

    if not MAPBOX_ACCESS_TOKEN:
        print("請設定 MAPBOX_ACCESS_TOKEN 環境變數（或改腳本內預設）")
        print("例: export MAPBOX_ACCESS_TOKEN=pk.eyJ1...")

    all_stores = []
    for cvs in CVS_TYPES:
        print(f"取得 {cvs} 門市清單...")
        stores = fetch_ecpay_store_list(cvs)
        print(f"  {len(stores)} 筆")
        for s in stores:
            s["CvsType"] = cvs
            all_stores.append(s)

    if not all_stores:
        print("未取得任何門市，請檢查 ECPAY_HASH_KEY / ECPAY_HASH_IV 是否正確")
        return

    # 地址 → 經緯度（Mapbox），並轉成 RestaurantPoint 格式
    raw = []
    for i, s in enumerate(all_stores):
        addr = s.get("StoreAddr", "").strip()
        if not addr:
            continue
        lat, lon = geocode_address(addr)
        if lat is None or lon is None:
            continue
        cvs = s.get("CvsType", "UNIMART")
        title = s.get("StoreName", "") or f"{cvs}"
        raw.append({
            "id": f"ecpay-{cvs}-{s.get('StoreId', i)}",
            "coord": [round(lon, 6), round(lat, 6)],
            "lat": lat,
            "lon": lon,
            "title": title,
            "emoji": CVS_EMOJI.get(cvs, "🏪"),
        })
        if (i + 1) % 100 == 0:
            print(f"  已 Geocoding {i + 1}/{len(all_stores)}...")
        time.sleep(0.06)

    # 距離合併 + 同格去重（與 overpass 腳本一致）
    kept = []
    for p in raw:
        lat, lon = p["lat"], p["lon"]
        is_dup = False
        for k in kept:
            if haversine_m(lat, lon, k["lat"], k["lon"]) < MERGE_RADIUS_M:
                is_dup = True
                break
        if is_dup:
            continue
        kept.append({"lat": lat, "lon": lon, "id": p["id"], "coord": p["coord"], "title": p["title"], "emoji": p["emoji"]})

    seen_cell = set()
    final = []
    for p in kept:
        cell = (round(p["lat"], GRID_DECIMALS), round(p["lon"], GRID_DECIMALS))
        if cell in seen_cell:
            continue
        seen_cell.add(cell)
        final.append(p)

    out_export = [{"id": p["id"], "coord": p["coord"], "title": p["title"], "emoji": p["emoji"]} for p in final]

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out_export, f, ensure_ascii=False, indent=2)

    print(f"綠界 {len(all_stores)} 筆 → Geocoding 成功 {len(raw)} 筆 → 去重後 {len(final)} 筆，儲存至 {out_path}")


if __name__ == "__main__":
    main()
