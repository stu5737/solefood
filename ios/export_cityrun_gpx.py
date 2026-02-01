#!/usr/bin/env python3
"""
生成 City Run 风格的 GPX 文件
使用方法：python3 ios/export_cityrun_gpx.py
"""

import os
from datetime import datetime, timedelta
import math
from pathlib import Path

def create_cityrun_gpx():
    """创建一个 City Run 风格的 GPX 文件"""
    now = datetime.now()
    
    # 台北 101 附近的循环路线
    base_lat = 25.0330
    base_lon = 121.5654
    radius = 0.005  # 约 500 米
    num_points = 60
    
    gpx_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Solefood-Export-CityRun" xmlns="http://www.topografix.com/GPX/1/1">',
        '  <metadata>',
        '    <name>City Run - Taipei Loop</name>',
        '    <desc>Generated City Run track for testing</desc>',
        f'    <time>{now.strftime("%Y-%m-%dT%H:%M:%SZ")}</time>',
        '  </metadata>',
        '  <trk>',
        '    <name>City Run Loop</name>',
        '    <trkseg>',
    ]
    
    for i in range(num_points):
        angle = (i / num_points) * 2 * math.pi
        lat = base_lat + radius * math.cos(angle)
        lon = base_lon + radius * math.sin(angle)
        
        point_time = now + timedelta(seconds=i * 10)
        time_str = point_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        gpx_lines.append(f'      <trkpt lat="{lat:.6f}" lon="{lon:.6f}">')
        gpx_lines.append(f'        <ele>{10 + (i % 5):.2f}</ele>')
        gpx_lines.append(f'        <time>{time_str}</time>')
        gpx_lines.append('      </trkpt>')
    
    gpx_lines.extend([
        '    </trkseg>',
        '  </trk>',
        '</gpx>',
    ])
    
    return '\n'.join(gpx_lines)

def main():
    print("🚀 正在生成 City Run GPX 文件...")
    print("=" * 50)
    
    # 创建 GPX 文件
    gpx_content = create_cityrun_gpx()
    
    # 保存文件
    script_dir = Path(__file__).parent
    output_dir = script_dir / "SolefoodMVP"
    output_file = output_dir / "CityRun_Loop.gpx"
    
    output_dir.mkdir(exist_ok=True)
    output_file.write_text(gpx_content, encoding='utf-8')
    
    print(f"✅ GPX 文件已生成: {output_file}")
    print(f"📍 路线: 台北 101 附近 1 公里循环")
    print(f"⏱️  时长: 约 10 分钟")
    print(f"📍 坐标点数: 60 个")
    print()
    print("📋 下一步：")
    print("1. 在 Xcode 中添加此 GPX 文件到项目")
    print("2. 在 Scheme 中选择此 GPX 文件")
    print("3. 运行应用测试")
    print()
    print("💡 如果需要真实的 City Run 数据：")
    print("   1. 在模拟器中选择 City Run")
    print("   2. 运行应用并开始采集")
    print("   3. 采集完成后，从应用数据中导出")

if __name__ == '__main__':
    main()
