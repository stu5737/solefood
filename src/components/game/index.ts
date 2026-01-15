/**
 * Game 組件匯出
 * 全新的遊戲界面組件 - Pokémon GO 風格 v9.0 Plus
 */

// v9.0 Plus - 全新 Pokémon GO 風格組件
export { BackpackCard } from './BackpackCard';
export { TopStaminaBar } from './TopStaminaBar';
export { MainActionButton } from './MainActionButton';
export type { GameState } from './MainActionButton';
export { FloatingTextSystem, useFloatingText } from './FloatingTextSystem';
export { RescueModal } from './RescueModal';
export type { RescueType } from './RescueModal';
export { LeftToolbar } from './LeftToolbar';

// 舊界面組件（保留以防萬一）
export { TopStatusBar } from './TopStatusBar';
export { GameMapView } from './GameMapView';
export { RightMenuPanel } from './RightMenuPanel';
export { NotificationPanel } from './NotificationPanel';
export { BottomNavBar } from './BottomNavBar';
export { CenterCharacter } from './CenterCharacter';

// 保留必要的功能組件
export { GhostOverlay } from './GhostOverlay';
export { AdRescueModal } from './AdRescueModal';
export { UnloadModal } from './UnloadModal';
export { DevDashboard } from './DevDashboard';
export { SimulatorMode } from './SimulatorMode';

// 暫時保留（未來可能還需要）
export { MapOverlay } from './MapOverlay';
