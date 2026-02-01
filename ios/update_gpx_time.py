#!/usr/bin/env python3
"""
更新 GPX 文件的时间戳为当前时间开始
这样 iOS 模拟器就会从现在开始播放轨迹
"""

import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import sys
import os

def update_gpx_timestamps(gpx_file_path):
    """更新 GPX 文件的时间戳"""
    
    print(f"🔧 正在更新 GPX 文件时间戳: {gpx_file_path}")
    print("=" * 60)
    
    # 读取 GPX 文件
    tree = ET.parse(gpx_file_path)
    root = tree.getroot()
    
    # GPX 命名空间
    namespace = {'gpx': 'http://www.topografix.com/GPX/1/1'}
    
    # 找到所有时间点
    time_elements = root.findall('.//gpx:time', namespace)
    
    if not time_elements:
        print("❌ 未找到时间标签")
        return False
    
    print(f"📍 找到 {len(time_elements)} 个时间点")
    
    # 获取第一个时间点的原始时间
    first_time_str = time_elements[0].text
    first_time = datetime.fromisoformat(first_time_str.replace('Z', '+00:00'))
    
    print(f"📅 原始第一个时间点: {first_time_str}")
    
    # 计算时间差
    now = datetime.now(first_time.tzinfo)
    time_diff = (now - first_time).total_seconds()
    
    print(f"📅 当前时间: {now.isoformat()}")
    print(f"⏱️  时间差: {time_diff:.0f} 秒 ({time_diff/3600:.1f} 小时)")
    
    # 如果时间是过去的，更新为从现在开始
    if time_diff > 0:
        print("🔄 时间戳是过去的，更新为从现在开始...")
        
        # 更新所有时间点
        for time_elem in time_elements:
            old_time_str = time_elem.text
            old_time = datetime.fromisoformat(old_time_str.replace('Z', '+00:00'))
            
            # 计算相对于第一个点的偏移
            offset = (old_time - first_time).total_seconds()
            
            # 新时间 = 现在 + 偏移
            new_time = now + timedelta(seconds=offset)
            time_elem.text = new_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # 保存文件
        tree.write(gpx_file_path, encoding='UTF-8', xml_declaration=True)
        
        print(f"✅ 已更新 {len(time_elements)} 个时间点")
        print(f"📅 新的第一个时间点: {time_elements[0].text}")
        print(f"📅 新的最后时间点: {time_elements[-1].text}")
        
        # 计算轨迹总时长
        last_time = datetime.fromisoformat(time_elements[-1].text.replace('Z', '+00:00'))
        duration = (last_time - now).total_seconds()
        print(f"⏱️  轨迹总时长: {duration:.0f} 秒 ({duration/60:.1f} 分钟)")
        
    else:
        print("ℹ️  时间戳已经是未来时间，无需修改")
    
    print("=" * 60)
    print("✅ 完成！")
    print()
    print("📋 下一步：")
    print("1. 在 Xcode 中清理构建: Product → Clean Build Folder (⇧⌘K)")
    print("2. 重新运行应用: npx expo run:ios")
    print("3. 应该能看到游标按照 GPX 轨迹移动了！")
    
    return True

if __name__ == '__main__':
    # GPX 文件路径
    gpx_file = os.path.join(
        os.path.dirname(__file__),
        'SolefoodMVP',
        '28-Jan-2026-1425.gpx'
    )
    
    if not os.path.exists(gpx_file):
        print(f"❌ 文件不存在: {gpx_file}")
        sys.exit(1)
    
    update_gpx_timestamps(gpx_file)
