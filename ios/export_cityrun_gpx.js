#!/usr/bin/env node

/**
 * 导出 City Run GPX 文件
 * 使用方法：
 * 1. 在模拟器中选择 City Run
 * 2. 运行应用并开始采集
 * 3. 运行此脚本：node ios/export_cityrun_gpx.js
 */

const fs = require('fs');
const path = require('path');

// 从应用的 GPS 历史服务中读取数据
// 或者从控制台日志中提取位置数据

function generateCityRunGPX() {
  // 创建一个示例 City Run 风格的 GPX 文件
  // 这是一个循环路线，模拟在城市中跑步
  
  const now = new Date();
  const points = [];
  
  // 创建一个简单的城市循环路线（以台北为例）
  // 起点和终点相同，形成一个循环
  const baseLat = 25.0330;  // 台北 101
  const baseLon = 121.5654;
  
  // 创建一个 1 公里的循环路线（约 10 分钟）
  const radius = 0.005; // 约 500 米半径
  const numPoints = 60; // 60 个点，每 10 秒一个
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const lat = baseLat + radius * Math.cos(angle);
    const lon = baseLon + radius * Math.sin(angle);
    
    const time = new Date(now.getTime() + i * 10000); // 每 10 秒一个点
    const timeStr = time.toISOString();
    
    points.push({
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
      ele: 10 + Math.random() * 5, // 海拔 10-15 米
      time: timeStr
    });
  }
  
  // 生成 GPX XML
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Solefood-Export-CityRun" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>City Run - Taipei Loop</name>
    <desc>Generated City Run track for testing</desc>
    <time>${now.toISOString()}</time>
  </metadata>
  <trk>
    <name>City Run Loop</name>
    <trkseg>
`;

  points.forEach(point => {
    gpx += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <ele>${point.ele.toFixed(2)}</ele>
        <time>${point.time}</time>
      </trkpt>
`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

// 主函数
function main() {
  const outputPath = path.join(__dirname, 'SolefoodMVP', 'CityRun_Loop.gpx');
  
  console.log('🚀 正在生成 City Run GPX 文件...');
  console.log('========================================');
  
  const gpx = generateCityRunGPX();
  
  fs.writeFileSync(outputPath, gpx, 'utf8');
  
  console.log(`✅ GPX 文件已生成: ${outputPath}`);
  console.log(`📍 路线: 台北 101 附近 1 公里循环`);
  console.log(`⏱️  时长: 约 10 分钟`);
  console.log(`📍 坐标点数: 60 个`);
  console.log('');
  console.log('📋 下一步：');
  console.log('1. 在 Xcode 中添加此 GPX 文件到项目');
  console.log('2. 在 Scheme 中选择此 GPX 文件');
  console.log('3. 运行应用测试');
}

main();
