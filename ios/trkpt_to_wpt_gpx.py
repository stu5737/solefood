#!/usr/bin/env python3
"""
將 GPX 的 <trkpt> 轉成 Xcode 支援的 <wpt> 格式
用法: python3 ios/trkpt_to_wpt_gpx.py [輸入.gpx] [輸出.gpx]
預設: 讀取 ios/SolefoodMVP/28-Jan-2026-1425.gpx，輸出 ios/SolefoodMVP/test.gpx
"""

import re
import sys
from pathlib import Path
from datetime import datetime, timedelta

def parse_trkpt_gpx(path: Path) -> list[dict]:
    """從 trkpt 格式 GPX 讀取 (lat, lon, time)"""
    text = path.read_text(encoding="utf-8")
    points = []
    # <trkpt lat="..." lon="..."> ... <time>...</time> ...
    for m in re.finditer(
        r'<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>.*?<time>([^<]+)</time>',
        text, re.DOTALL
    ):
        lat, lon, time_str = m.groups()
        time_str = time_str.strip().replace(" ", "T")
        if not time_str.endswith("Z") and "+" not in time_str:
            time_str = time_str + "Z"
        points.append({"lat": lat, "lon": lon, "time": time_str})
    return points

def write_wpt_gpx(path: Path, points: list[dict], creator: str = "SolefoodMVP"):
    """寫出 Xcode 用的 <wpt> GPX"""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<gpx version="1.1" creator="{creator}">',
    ]
    for i, p in enumerate(points):
        name_tag = '\n        <name>起點</name>' if i == 0 else ''
        lines.append(f'    <wpt lat="{p["lat"]}" lon="{p["lon"]}">{name_tag}')
        lines.append(f'        <time>{p["time"]}</time>')
        lines.append('    </wpt>')
    lines.append('</gpx>')
    path.write_text("\n".join(lines), encoding="utf-8")

def main():
    ios_dir = Path(__file__).parent
    base = ios_dir / "SolefoodMVP"
    # 28-Jan 可能在 ios/ 或 SolefoodMVP/
    src = ios_dir / "28-Jan-2026-1425.gpx" if (ios_dir / "28-Jan-2026-1425.gpx").exists() else base / "28-Jan-2026-1425.gpx"
    dst = base / "test.gpx"
    if len(sys.argv) >= 2:
        src = Path(sys.argv[1])
    if len(sys.argv) >= 3:
        dst = Path(sys.argv[2])
    if not src.exists():
        print(f"找不到: {src}")
        sys.exit(1)
    points = parse_trkpt_gpx(src)
    if not points:
        print("未找到任何 trkpt 點，請確認 GPX 含 <trkpt> 與 <time>")
        sys.exit(1)
    dst.parent.mkdir(parents=True, exist_ok=True)
    write_wpt_gpx(dst, points)
    print(f"已轉換 {len(points)} 個點 -> {dst}")

if __name__ == "__main__":
    main()
