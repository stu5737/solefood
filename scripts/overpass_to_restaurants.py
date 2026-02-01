#!/usr/bin/env python3
"""
將 Overpass 輸出的 taiwan_711_full.json 轉成 App 餐廳格式
輸出: assets/data/taiwan_711_restaurants.json（RestaurantPoint[]）
執行: python3 scripts/overpass_to_restaurants.py
（請先執行 fetch_711_taiwan.py 產生 taiwan_711_full.json）

會自動合併「距離過近」的重複點（同一門市在 OSM 常有 node + way 多筆），
只保留一筆代表點，避免地圖上重疊一堆 7-Eleven。
"""

import json
import math
import os

# 兩點距離小於此值（米）視為同一家店，只保留一筆（調大一點可清掉「兩個座標」重疊）
MERGE_RADIUS_M = 30
# 同一格（小數第5位相同，約 1.1m）只留一筆，確保不會有兩個幾乎同位置的點
GRID_DECIMALS = 5


def haversine_m(lat1, lon1, lat2, lon2):
    """計算兩點距離（米）。"""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_lat_lon(elem):
    """從 Overpass 元素取得 (lat, lon)。node 直接有；way 用 center 或 bounds 中心。"""
    if elem.get("type") == "node":
        return elem.get("lat"), elem.get("lon")
    if elem.get("type") == "way":
        if "center" in elem:
            return elem["center"].get("lat"), elem["center"].get("lon")
        if "bounds" in elem:
            b = elem["bounds"]
            lat = (b["minlat"] + b["maxlat"]) / 2
            lon = (b["minlon"] + b["maxlon"]) / 2
            return lat, lon
    if elem.get("type") == "relation":
        if "center" in elem:
            return elem["center"].get("lat"), elem["center"].get("lon")
        if "bounds" in elem:
            b = elem["bounds"]
            lat = (b["minlat"] + b["maxlat"]) / 2
            lon = (b["minlon"] + b["maxlon"]) / 2
            return lat, lon
    return None, None


def overpass_to_restaurants():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    in_path = os.path.join(script_dir, "taiwan_711_full.json")
    out_dir = os.path.join(root, "assets", "data")
    out_path = os.path.join(out_dir, "taiwan_711_restaurants.json")

    if not os.path.isfile(in_path):
        print(f"找不到 {in_path}，請先執行: python3 scripts/fetch_711_taiwan.py")
        return

    os.makedirs(out_dir, exist_ok=True)

    with open(in_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 先收集所有有效點
    raw = []
    for elem in data.get("elements", []):
        lat, lon = get_lat_lon(elem)
        if lat is None or lon is None:
            continue
        tags = elem.get("tags") or {}
        name = tags.get("name") or tags.get("brand:en") or "7-Eleven"
        raw.append({
            "id": f"711-{elem.get('type', 'n')}{elem.get('id')}",
            "coord": [round(lon, 6), round(lat, 6)],
            "lat": lat,
            "lon": lon,
            "title": name,
            "emoji": "🥤",
        })

    # 1) 距離合併：與已保留點距離 < MERGE_RADIUS_M 的視為同一家店，只保留一筆
    kept = []
    for p in raw:
        lat, lon = p["lat"], p["lon"]
        is_duplicate = False
        for k in kept:
            if haversine_m(lat, lon, k["lat"], k["lon"]) < MERGE_RADIUS_M:
                is_duplicate = True
                break
        if is_duplicate:
            continue
        kept.append({"lat": lat, "lon": lon, **{k: p[k] for k in ("id", "coord", "title", "emoji")}})

    # 2) 同格只留一筆：小數第 GRID_DECIMALS 位相同視為同一座標，清掉殘留的雙點
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

    print(f"原始 {len(raw)} 筆 → 距離合併 {len(kept)} 筆 → 同格去重 {len(final)} 筆，儲存至 {out_path}")
    return out_path


if __name__ == "__main__":
    overpass_to_restaurants()
