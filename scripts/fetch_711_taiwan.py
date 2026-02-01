#!/usr/bin/env python3
"""
抓取全台灣 7-Eleven 座標（Overpass API）
輸出: taiwan_711_full.json（原始 Overpass 格式）
執行: python3 scripts/fetch_711_taiwan.py
依賴: 無（使用 Python 內建 urllib）
"""

import json
import os
import urllib.request
import urllib.error
import urllib.parse

OVERPASS_URL = "http://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:90];
area["name:en"="Taiwan"]->.searchArea;
(
  node["brand:en"="7-Eleven"](area.searchArea);
  way["brand:en"="7-Eleven"](area.searchArea);
  relation["brand:en"="7-Eleven"](area.searchArea);
);
out body;
>;
out skel qt;
"""


def fetch_711_taiwan():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, "taiwan_711_full.json")

    print("正在請求全台灣 7-Eleven 數據，請稍候...")
    try:
        req = urllib.request.Request(
            OVERPASS_URL,
            data=urllib.parse.urlencode({"data": QUERY}).encode("utf-8"),
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=120) as response:
            data = json.loads(response.read().decode("utf-8"))
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        count = len(data.get("elements", []))
        print(f"成功！已抓取 {count} 筆資料，儲存至 {out_path}")
        return out_path
    except urllib.error.URLError as e:
        print(f"網路錯誤（請確認網路連線）: {e}")
        raise
    except Exception as e:
        print(f"發生錯誤: {e}")
        raise


if __name__ == "__main__":
    fetch_711_taiwan()
