/**
 * Avatar3D - 使用 expo-gl + Three.js 渲染 3D 模型
 * 
 * 這是 ModelLayer 的備用方案，保證可以顯示 3D 模型
 * 
 * 使用方式：
 * 1. 安裝依賴：npx expo install expo-gl expo-three && npm install three @types/three --save-dev
 * 2. 在 MapboxRealTimeMap.tsx 中使用 Mapbox.MarkerView 包裹此組件
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

// ⚠️ 需要先安裝：npx expo install expo-gl expo-three && npm install three @types/three --save-dev
// 暫時註釋掉，等安裝後再啟用
/*
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
*/

interface Avatar3DProps {
  modelUrl: string;
  rotation: number; // 角度（0-360）
  scale?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const Avatar3D: React.FC<Avatar3DProps> = ({
  modelUrl,
  rotation,
  scale = 0.5,
  onLoad,
  onError,
}) => {
  const [gl, setGl] = useState<any>(null);
  const [model, setModel] = useState<any>(null);

  // ⚠️ 暫時禁用，等安裝依賴後啟用
  const onContextCreate = async (gl: any) => {
    /*
    try {
      setGl(gl);
      
      // 設置 Three.js
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // 透明背景
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      camera.position.z = 2;
      
      // 添加光源
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambientLight);
      
      // 加載 GLB 模型
      const loader = new GLTFLoader();
      console.log('[Avatar3D] 📦 加載模型:', modelUrl);
      
      const gltf = await loader.loadAsync(modelUrl);
      const loadedModel = gltf.scene;
      loadedModel.scale.set(scale, scale, scale);
      scene.add(loadedModel);
      setModel(loadedModel);
      
      console.log('[Avatar3D] ✅ 模型加載成功');
      onLoad?.();
      
      // 渲染循環
      const animate = () => {
        requestAnimationFrame(animate);
        
        // 應用旋轉
        if (loadedModel) {
          loadedModel.rotation.y = (rotation * Math.PI) / 180;
        }
        
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      
      animate();
    } catch (error) {
      console.error('[Avatar3D] ❌ 初始化失敗:', error);
      onError?.(error as Error);
    }
    */
    console.log('[Avatar3D] ⚠️ expo-gl 未安裝，請先安裝依賴');
  };

  // 更新旋轉
  useEffect(() => {
    if (model) {
      model.rotation.y = (rotation * Math.PI) / 180;
    }
  }, [rotation, model]);

  return (
    <View style={styles.container}>
      {/* ⚠️ 暫時禁用，等安裝依賴後啟用 */}
      {/* <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      /> */}
      <View style={styles.placeholder}>
        {/* 佔位符，等安裝依賴後替換為 GLView */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    backgroundColor: 'transparent',
  },
  glView: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
