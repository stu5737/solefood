#!/usr/bin/env python3
"""
更新 test.gpx 的時間戳為當前時間開始
這樣 iOS 模擬器就會從現在開始播放軌跡
"""

import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import sys
import os
from pathlib import Path

def update_gpx_timestamps(gpx_file_path):
    """更新 GPX 文件的時間戳"""
    
    print(f"🔧 正在更新 GPX 文件時間戳: {gpx_file_path}")
    print("=" * 60)
    
    # 讀取 GPX 文件
    tree = ET.parse(gpx_file_path)
    root = tree.getroot()
    
    # test.gpx 可能沒有 xmlns，用兩種方式找 <time>
    time_elements = root.findall('.//{http://www.topografix.com/GPX/1/1}time')
    if not time_elements:
        time_elements = root.findall('.//time')
    
    if not time_elements:
        print("❌ 未找到時間標籤")
        return False
    
    print(f"📍 找到 {len(time_elements)} 個時間點")
    
    # 獲取第一個時間點的原始時間
    first_time_str = time_elements[0].text.strip() if time_elements[0].text else ""
    first_time_str = first_time_str.replace(" ", "T")
    if not first_time_str.endswith("Z") and "+" not in first_time_str:
        first_time_str = first_time_str + "Z"
    
    first_time = datetime.fromisoformat(first_time_str.replace('Z', '+00:00'))
    
    print(f"📅 原始第一個時間點: {first_time_str}")
    
    # 計算時間差
    now = datetime.now(first_time.tzinfo)
    time_diff = (now - first_time).total_seconds()
    
    print(f"📅 當前時間: {now.strftime('%Y-%m-%dT%H:%M:%SZ')}")
    print(f"⏱️  時間差: {time_diff:.0f} 秒 ({time_diff/3600:.1f} 小時)")
    
    # 如果時間是過去的，更新為從現在開始
    if time_diff > 0:
        print("🔄 時間戳是過去的，更新為從現在開始...")
        
        # 更新所有時間點
        for time_elem in time_elements:
            old_time_str = (time_elem.text or "").strip().replace(" ", "T")
            if not old_time_str.endswith("Z") and "+" not in old_time_str:
                old_time_str = old_time_str + "Z"
            old_time = datetime.fromisoformat(old_time_str.replace('Z', '+00:00'))
            
            # 計算相對於第一個點的偏移
            offset = (old_time - first_time).total_seconds()
            
            # 新時間 = 現在 + 偏移
            new_time = now + timedelta(seconds=offset)
            time_elem.text = new_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # 保存文件
        tree.write(gpx_file_path, encoding='UTF-8', xml_declaration=True)
        
        print(f"✅ 已更新 {len(time_elements)} 個時間點")
        print(f"📅 新的第一個時間點: {time_elements[0].text}")
        print(f"📅 新的最後時間點: {time_elements[-1].text}")
        
        # 計算軌跡總時長
        last_time = datetime.fromisoformat(time_elements[-1].text.replace('Z', '+00:00'))
        duration = (last_time - now).total_seconds()
        print(f"⏱️  軌跡總時長: {duration:.0f} 秒 ({duration/60:.1f} 分鐘)")
        
    else:
        print("ℹ️  時間戳已經是未來時間，無需修改")
    
    print("=" * 60)
    print("✅ 完成！")
    print()
    print("📋 下一步：")
    print("1. 在 Xcode Scheme 中選擇 test.gpx：Run → Options → Default Location → test")
    print("2. 重新運行應用：npx expo run:ios 或在 Xcode 按 ⌘R")
    
    return True

if __name__ == '__main__':
    # test.gpx 路徑
    script_dir = Path(__file__).parent
    gpx_file = script_dir / 'SolefoodMVP' / 'test.gpx'
    
    if not gpx_file.exists():
        print(f"❌ 文件不存在: {gpx_file}")
        sys.exit(1)
    
    update_gpx_timestamps(str(gpx_file))
