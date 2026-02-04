/**
 * 卸貨變現模態框
 * - 隨地卸貨（主按鈕）：兩按鈕 = 就地野餐 0x／看影片叫貨車 1.5x
 * - 餐廳圖標卸貨（需 GPS 到點）：三按鈕 = 自己搬 1x／按廣告卸貨 2x／拍照 10x
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../../stores/playerStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { executeUnloadSettlement, calculateSettlement } from '../../core/game/unloading';
import { calculateUnloadStaminaCost } from '../../core/math/unloading';
import { PAYOUT_MATRIX } from '../../utils/constants';
import type { PayoutMode } from '../../types/game';

const STAMINA_ICON = require('../../../assets/images/stamina_icon.png');
const TRUCK_ICON = require('../../../assets/images/truck_icon.png');
const AD_ICON = require('../../../assets/images/ad_icon.png');
const HANDTRUCK_ICON = require('../../../assets/images/handtruck_icon.png');
const UNLOAD_ICON = require('../../../assets/images/unload_icon.png');
const CAMERA_ICON = require('../../../assets/images/camera_icon.png');
const SOIL_TOKEN_ICON = require('../../../assets/images/soil_token_icon.png');
const PICNIC_ICON = require('../../../assets/images/picnic_icon.png');

async function watchAd(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 1000);
  });
}

export interface UnloadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (revenue: number) => void;
  /** 選擇「就地野餐」時呼叫（僅隨地卸貨兩按鈕時） */
  onPicnic?: () => void;
  /** 隨地卸貨（主按鈕）→ 兩按鈕；餐廳圖標卸貨（需到點）→ 三按鈕 */
  unloadSource?: 'anywhere' | 'restaurant';
  /** 餐廳模式時，是否為金霧節點（解鎖 10x 拍照） */
  isGoldenMistNode?: boolean;
}

export function UnloadModal({
  visible,
  onClose,
  onSuccess,
  onPicnic,
  unloadSource = 'anywhere',
  isGoldenMistNode = false,
}: UnloadModalProps) {
  const [selectedMode, setSelectedMode] = useState<PayoutMode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();
  const playerState = usePlayerStore();
  const inventoryStore = useInventoryStore();
  const stamina = playerState.stamina;

  // Android 專用：避免爆框／超過底框，安全區域 + 整體縮小 90% 塞進螢幕
  const windowWidth = Dimensions.get('window').width;
  const horizontalPadding = Platform.OS === 'android' ? Math.max(20, insets.left, insets.right) : 20;
  const bottomPadding = Platform.OS === 'android' ? Math.max(20, insets.bottom) : 20;
  const maxCardWidth = Platform.OS === 'android' ? Math.min(400, windowWidth - 2 * horizontalPadding) : 400;
  const isNarrow = Platform.OS === 'android' && maxCardWidth < 360;
  const btnSize = Platform.OS === 'android' ? (isNarrow ? 90 : 106) : (isNarrow ? 100 : 118);
  const rowGap = Platform.OS === 'android' ? (isNarrow ? 7 : 10) : (isNarrow ? 8 : 12);
  const maxStamina = playerState.maxStamina;
  const picnicRecover = Math.min(30, maxStamina - stamina);

  const totalWeight = inventoryStore.totalWeight;
  const items = inventoryStore.items;
  const itemCount = items.length;
  const porterPreview = calculateSettlement('porter', unloadSource);
  const normalPreview = calculateSettlement('normal');
  const dataPreview = calculateSettlement('data');
  const porterMultiplier = unloadSource === 'restaurant' ? PAYOUT_MATRIX.PORTER_AT_RESTAURANT : PAYOUT_MATRIX.PORTER;
  const unloadStaminaCost = Math.round(calculateUnloadStaminaCost(totalWeight));
  const canUnloadNormal = playerState.stamina >= unloadStaminaCost;

  const handlePicnic = () => {
    onClose();
    onPicnic?.();
  };

  const handleUnload = async (mode: PayoutMode) => {
    if (mode === 'normal' && !canUnloadNormal) return;
    setSelectedMode(mode);
    setIsProcessing(true);
    try {
      if (mode === 'porter' || mode === 'data') {
        const ok = await watchAd();
        if (!ok) {
          setIsProcessing(false);
          setSelectedMode(null);
          return;
        }
      }
      const result = executeUnloadSettlement(mode, unloadSource);
      setIsProcessing(false);
      setSelectedMode(null);
      onClose();
      onSuccess?.(result.revenue);
    } catch (e) {
      console.error('[UnloadModal]', e);
      setIsProcessing(false);
      setSelectedMode(null);
    }
  };

  const handlePorter = async () => {
    await handleUnload('porter');
  };

  // 空背包時仍顯示彈窗，可選擇野餐／卸貨，只是無獎勵（revenue 0）
  const androidOptionColStyle = Platform.OS === 'android' ? { width: btnSize } : {};
  const androidSquareBtnStyle = Platform.OS === 'android' ? { width: btnSize, height: btnSize } : {};
  const androidMultiplierStyle = Platform.OS === 'android' ? { marginBottom: 5 } : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          styles.overlay,
          Platform.OS === 'android' && {
            paddingLeft: horizontalPadding,
            paddingRight: horizontalPadding,
            paddingTop: Math.max(20, insets.top),
            paddingBottom: bottomPadding,
          },
        ]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.centered,
            Platform.OS === 'android' && {
              maxWidth: maxCardWidth,
              paddingVertical: 16,
              paddingHorizontal: 16,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.topRow, Platform.OS === 'android' && { marginBottom: 10 }]}>
            <Text style={styles.header}>
              📦 {itemCount} Items  ·  ⚖️ {totalWeight.toFixed(1)}kg
            </Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              onPress={onClose}
              disabled={isProcessing}
              hitSlop={12}
            >
              <Text style={styles.closeSymbol}>×</Text>
            </Pressable>
          </View>

          {/* 兩按鈕與三按鈕：同一按鈕尺寸、設計一致（折衷 118px）；Android 窄螢幕縮小避免爆框 */}
          <View style={[styles.row, Platform.OS === 'android' && { gap: rowGap, marginBottom: 10 }]}>
            {unloadSource === 'anywhere' ? (
              <>
                {/* 1. 就地野餐（0x） */}
                <View style={[styles.optionCol, androidOptionColStyle]}>
                  <View style={[styles.multiplierAbove, styles.multiplierAboveManual, androidMultiplierStyle]}>
                    <Text style={styles.multiplierTextDark}>0x</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.squareBtn,
                      androidSquareBtnStyle,
                      styles.cardBase,
                      pressed && styles.squareBtnPressed,
                    ]}
                    onPress={handlePicnic}
                    disabled={isProcessing}
                  >
                    <View style={styles.squareInner}>
                      <View style={styles.picnicIconWrap}>
                        <Image source={PICNIC_ICON} style={styles.squareIcon} resizeMode="contain" />
                      </View>
                      <View style={styles.squarePriceRow}>
                        <Image source={SOIL_TOKEN_ICON} style={styles.squareSoilIcon} resizeMode="contain" />
                        <Text style={styles.priceBase}>0</Text>
                      </View>
                      <View style={styles.squareStaminaRow}>
                        <Image source={STAMINA_ICON} style={styles.squareStaminaIcon} resizeMode="contain" />
                        <Text style={styles.staminaFree}>+{Math.round(picnicRecover)}</Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
                {/* 2. 看影片叫貨車（1.5x） */}
                <View style={[styles.optionCol, androidOptionColStyle]}>
                  <View style={[styles.multiplierAbove, styles.multiplierAbovePorter, androidMultiplierStyle]}>
                    <Image source={AD_ICON} style={styles.multiplierBadgeIcon} resizeMode="contain" />
                    <Text style={styles.multiplierTextDark}>{porterMultiplier}x</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.squareBtn,
                      androidSquareBtnStyle,
                      styles.cardBase,
                      pressed && styles.squareBtnPressed,
                    ]}
                    onPress={handlePorter}
                    disabled={isProcessing}
                  >
                    {isProcessing && selectedMode === 'porter' ? (
                      <ActivityIndicator size="small" color="#333" style={styles.loader} />
                    ) : (
                      <View style={styles.squareInner}>
                        <View style={styles.truckIconWrap}>
                          <Image source={TRUCK_ICON} style={styles.truckIcon} resizeMode="contain" />
                        </View>
                        <View style={styles.squarePriceRow}>
                          <Image source={SOIL_TOKEN_ICON} style={styles.squareSoilIcon} resizeMode="contain" />
                          <Text style={styles.priceBase}>{porterPreview.revenue.toFixed(0)}</Text>
                        </View>
                        <View style={styles.squareStaminaRow}>
                          <Image source={STAMINA_ICON} style={styles.squareStaminaIcon} resizeMode="contain" />
                          <Text style={styles.staminaFree}>FREE</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {/* 餐廳卸貨：1. 自己搬（1x） */}
                <View style={[styles.optionCol, androidOptionColStyle]}>
                  <View style={[styles.multiplierAbove, styles.multiplierAboveManual, androidMultiplierStyle]}>
                    <Text style={styles.multiplierTextDark}>{PAYOUT_MATRIX.NORMAL}x</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.squareBtn,
                      androidSquareBtnStyle,
                      styles.cardBase,
                      !canUnloadNormal && styles.cardDisabled,
                      pressed && styles.squareBtnPressed,
                    ]}
                    onPress={() => handleUnload('normal')}
                    disabled={!canUnloadNormal || isProcessing}
                  >
                    {isProcessing && selectedMode === 'normal' ? (
                      <ActivityIndicator size="small" color="#333" style={styles.loader} />
                    ) : (
                      <View style={styles.squareInner}>
                        <View style={styles.unloadIconWrap}>
                          <Image source={UNLOAD_ICON} style={styles.unloadIcon} resizeMode="contain" />
                        </View>
                        <View style={styles.squarePriceRow}>
                          <Image source={SOIL_TOKEN_ICON} style={styles.squareSoilIcon} resizeMode="contain" />
                          <Text style={styles.priceBase}>{normalPreview.revenue.toFixed(0)}</Text>
                        </View>
                        <View style={styles.squareStaminaRow}>
                          <Image source={STAMINA_ICON} style={styles.squareStaminaIcon} resizeMode="contain" />
                          <Text style={styles.staminaCost}>-{unloadStaminaCost}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                </View>
                {/* 2. 按廣告卸貨（2x）- 餐廳用 handtruck_icon */}
                <View style={[styles.optionCol, androidOptionColStyle]}>
                  <View style={[styles.multiplierAbove, styles.multiplierAbovePorter, androidMultiplierStyle]}>
                    <Image source={AD_ICON} style={styles.multiplierBadgeIcon} resizeMode="contain" />
                    <Text style={styles.multiplierTextDark}>{porterMultiplier}x</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.squareBtn,
                      androidSquareBtnStyle,
                      styles.cardBase,
                      pressed && styles.squareBtnPressed,
                    ]}
                    onPress={() => handleUnload('porter')}
                    disabled={isProcessing}
                  >
                    {isProcessing && selectedMode === 'porter' ? (
                      <ActivityIndicator size="small" color="#333" style={styles.loader} />
                    ) : (
                      <View style={styles.squareInner}>
                        <View style={styles.handtruckIconWrap}>
                          <Image source={HANDTRUCK_ICON} style={styles.handtruckIcon} resizeMode="contain" />
                        </View>
                        <View style={styles.squarePriceRow}>
                          <Image source={SOIL_TOKEN_ICON} style={styles.squareSoilIcon} resizeMode="contain" />
                          <Text style={styles.priceBase}>{porterPreview.revenue.toFixed(0)}</Text>
                        </View>
                        <View style={styles.squareStaminaRow}>
                          <Image source={STAMINA_ICON} style={styles.squareStaminaIcon} resizeMode="contain" />
                          <Text style={styles.staminaFree}>FREE</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                </View>
                {/* 3. 拍照 10x（金霧節點可點） */}
                <View style={[styles.optionCol, androidOptionColStyle]}>
                  <View style={[styles.multiplierAbove, styles.multiplierAboveData, androidMultiplierStyle]}>
                    <Text style={styles.multiplierTextDark}>{PAYOUT_MATRIX.DATA}x</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.squareBtn,
                      androidSquareBtnStyle,
                      styles.cardBase,
                      !isGoldenMistNode && styles.cardDisabled,
                      pressed && styles.squareBtnPressed,
                    ]}
                    onPress={() => isGoldenMistNode && handleUnload('data')}
                    disabled={!isGoldenMistNode || isProcessing}
                  >
                    {isProcessing && selectedMode === 'data' ? (
                      <ActivityIndicator size="small" color="#333" style={styles.loader} />
                    ) : (
                      <View style={styles.squareInner}>
                        <Image source={CAMERA_ICON} style={styles.cameraIcon} resizeMode="contain" />
                        <View style={styles.squarePriceRow}>
                          <Image source={SOIL_TOKEN_ICON} style={styles.squareSoilIcon} resizeMode="contain" />
                          <Text style={styles.priceBase}>{dataPreview.revenue.toFixed(0)}</Text>
                        </View>
                        <View style={styles.squareStaminaRow}>
                          <Image source={STAMINA_ICON} style={styles.squareStaminaIcon} resizeMode="contain" />
                          <Text style={styles.staminaFree}>FREE</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centered: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
    paddingRight: 4,
  },
  header: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    opacity: 0.8,
  },
  closeSymbol: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 28,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  optionCol: {
    width: 118,
    alignItems: 'center',
  },
  multiplierAbove: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  multiplierBadgeIcon: {
    width: 18,
    height: 18,
    marginRight: 5,
  },
  multiplierAboveManual: {
    backgroundColor: '#E8E8E8',
  },
  multiplierAbovePorter: {
    backgroundColor: '#D0E0F0',
  },
  multiplierAboveData: {
    backgroundColor: '#F0E8D8',
  },
  squareBtn: {
    width: 118,
    height: 118,
    borderRadius: 20,
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'visible',
  },
  squareBtnPressed: {
    opacity: 0.88,
  },
  cardBase: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  cardDisabled: {
    opacity: 0.96,
  },
  multiplierTextDark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333',
  },
  squareInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingBottom: 8,
  },
  squareIcon: {
    width: 52,
    height: 52,
  },
  cameraIcon: {
    width: 58,
    height: 58,
  },
  picnicIconWrap: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -12,
  },
  truckIcon: {
    width: 64,
    height: 64,
  },
  truckIconWrap: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -12,
  },
  unloadIcon: {
    width: 64,
    height: 64,
  },
  unloadIconWrap: {
    marginBottom: -6,
  },
  handtruckIcon: {
    width: 64,
    height: 64,
  },
  handtruckIconWrap: {
    marginBottom: -6,
  },
  squarePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  squareSoilIcon: {
    width: 20,
    height: 20,
  },
  priceBase: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2C2C',
  },
  squareStaminaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  squareStaminaIcon: {
    width: 22,
    height: 22,
  },
  staminaCost: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B71C1C',
  },
  staminaFree: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  loader: {
    marginVertical: 8,
  },
});
