#!/usr/bin/env python3
"""
合併綠界 + Overpass 兩份門市圖資並去重，輸出單一 JSON 給 App 直接載入。
App 不再在登入/載入時做 merge 計算。

輸入: assets/data/ecpay_convenience_stores.json
      assets/data/taiwan_711_restaurants.json
輸出: assets/data/merged_convenience_stores.json（RestaurantPoint[]）

執行: python3 scripts/merge_store_sources.py
"""

import json
import math
import os

MERGE_RADIUS_M = 30
GRID_DECIMALS = 5


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def load_json(path):
    if not os.path.isfile(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root, "assets", "data")
    ecpay_path = os.path.join(data_dir, "ecpay_convenience_stores.json")
    overpass_path = os.path.join(data_dir, "taiwan_711_restaurants.json")
    out_path = os.path.join(data_dir, "merged_convenience_stores.json")

    ecpay = load_json(ecpay_path)
    overpass = load_json(overpass_path)
    raw = ecpay + overpass

    if not raw:
        print("兩份來源皆無資料，請先執行 fetch_711 / ecpay_store_list 產生 JSON")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return

    # 每筆需有 coord [lng, lat]
    with_latlon = []
    for p in raw:
        c = p.get("coord")
        if not c or len(c) != 2:
            continue
        lon, lat = float(c[0]), float(c[1])
        with_latlon.append({
            "id": p.get("id", ""),
            "coord": [round(lon, 6), round(lat, 6)],
            "lat": lat,
            "lon": lon,
            "title": p.get("title", ""),
            "emoji": p.get("emoji", "🏪"),
        })

    # 距離合併
    kept = []
    for p in with_latlon:
        is_dup = False
        for k in kept:
            if haversine_m(p["lat"], p["lon"], k["lat"], k["lon"]) < MERGE_RADIUS_M:
                is_dup = True
                break
        if is_dup:
            continue
        kept.append(p)

    # 同格去重
    seen = set()
    final = []
    for p in kept:
        cell = (round(p["lat"], GRID_DECIMALS), round(p["lon"], GRID_DECIMALS))
        if cell in seen:
            continue
        seen.add(cell)
        final.append({"id": p["id"], "coord": p["coord"], "title": p["title"], "emoji": p["emoji"]})

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    print(f"綠界 {len(ecpay)} + Overpass {len(overpass)} → 合併去重後 {len(final)} 筆 → {out_path}")


if __name__ == "__main__":
    main()
