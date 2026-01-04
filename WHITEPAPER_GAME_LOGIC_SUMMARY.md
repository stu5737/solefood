# Solefood MVP v8.7 - Game Logic & Constants Summary
## For Whitepaper Update

---

## 1. Movement & Stamina System

### Base Consumption Rate
| Metric | Value | Formula |
|--------|-------|---------|
| **Base Burn per 100m** | 1.0 pt | `distance (km) × 10` |
| **Base Burn per 1km** | 10 pts | `STAMINA.BURN_PER_KM = 10` |
| **Max Stamina** | 100 pts | `STAMINA.MAX_STAMINA = 100` |

### Weight Penalty Multiplier
| Condition | Multiplier | Formula |
|-----------|------------|---------|
| **Empty Backpack** | 1.0x | `1.0 + (currentWeight / maxWeight) = 1.0` |
| **Half Loaded** | 1.5x | `1.0 + (5kg / 10kg) = 1.5` |
| **Full Backpack** | 2.0x | `1.0 + (10kg / 10kg) = 2.0` |

**Final Movement Burn Formula:**
```
finalBurn = baseBurn × (1 + (currentWeight / maxWeight))
```

**Example:**
- Walk 100m with empty bag: `1.0 × 1.0 = 1.0 pt`
- Walk 100m with full bag: `1.0 × 2.0 = 2.0 pt`

### Pickup Costs (Labor Cost)
| Tier | Pickup Cost | Item Name |
|------|-------------|-----------|
| **T1** | 3 pts | 琥珀粗糖 (Amber Sugar) |
| **T2** | 9 pts | 翡翠晶糖 (Jade Sugar) |
| **T3** | 30 pts | 皇室純糖 (Royal Sugar) |

**Note:** Pickup cost is deducted **immediately** when item enters inventory, regardless of whether it's later consumed.

### Sprint vs Walk
- **No separate multiplier** for sprint speed
- Movement burn is **distance-based**, not speed-based
- Speed is only used for **anti-cheat validation** (max 50 km/h)

---

## 2. Industrial Durability System (Tiered Threshold)

### Core Formula: Industrial Reinforcement Model
```
decay = distance × (1 + (currentWeight × 0.15)) × 0.1
```

**Coefficients:**
- **Weight Coefficient:** `0.15` (Industrial Reinforcement - low friction for high-end gear)
- **Scaling Factor:** `0.1` (Converts to user-friendly percentage values)

### Decay Examples
| Scenario | Distance | Weight | Weight Factor | Decay |
|----------|----------|--------|---------------|-------|
| **Newbie (Empty)** | 1.0 km | 0 kg | `1 + (0 × 0.15) = 1.0` | `1.0 × 1.0 × 0.1 = 0.1%` |
| **Newbie (Full)** | 1.0 km | 10 kg | `1 + (10 × 0.15) = 2.5` | `1.0 × 2.5 × 0.1 = 0.25%` |
| **Whale (Full)** | 1.0 km | 30 kg | `1 + (30 × 0.15) = 5.5` | `1.0 × 5.5 × 0.1 = 0.55%` |

**10km Stress Test:**
- **Newbie (10kg):** `10 × 2.5 × 0.1 = 2.5%` total wear
- **Whale (30kg):** `10 × 5.5 × 0.1 = 5.5%` total wear

### 90% Threshold (Forgiveness Mechanic)
| Durability | Effective Capacity | Behavior |
|------------|-------------------|----------|
| **≥ 90%** | `baseMaxWeight × 1.0` | Full capacity available |
| **< 90%** | `baseMaxWeight × 0.9` | Capacity reduced to 90% (warning triggered) |

**Example:**
- Base capacity: 10kg
- Durability: 85%
- **Effective capacity:** `10 × 0.9 = 9.0 kg` (not `10 × 0.85 = 8.5 kg`)

### Settlement: Cumulative Debt System
1. **During Movement:**
   - Durability decay is **accumulated** as `pendingDurabilityDebt` in `sessionStore`
   - **No real-time deduction** from player durability
   - Formula: `decay = distance × (1 + (currentWeight × 0.15)) × 0.1`

2. **At Unload Settlement:**
   - Total debt is retrieved: `totalDurabilityLoss = sessionStore.pendingDurabilityDebt`
   - Applied once: `player.updateDurability(-totalDurabilityLoss)`
   - Debt reset: `sessionStore.resetDurabilityDebt()`

**Anti-Cheat Protection:**
- Prevents "Load Shedding" exploit (dumping weight before unload to avoid repair costs)
- Debt is locked based on **actual weight carried during journey**

### Repair Cost Formula
```
repairCost = durabilityLoss × (5 × baseMaxWeight)
```

**Example:**
- Durability loss: 2.5%
- Base capacity: 10kg
- **Repair cost:** `2.5 × (5 × 10) = 125 $SOLE`

---

## 3. Strategic Hygiene System (Quality-Based)

### Real-Time Deduction (Split-Timing Mechanism)
- **When:** Hygiene is deducted **immediately** when item enters inventory
- **Formula:** `player.updateHygiene(-contamination)` on successful `addItem()`
- **Contamination Values:**
  - T1: `-0.2%` per item
  - T2: `-0.6%` per item
  - T3: `-1.0%` per item

**Rationale:** Players see hygiene changes in real-time, enabling strategic decisions (e.g., "Should I pick up this T3 now or wait until after cleaning?")

### 90% Grade B Rule (Tiered Threshold)
| Hygiene | Quality Grade | Revenue Multiplier | Behavior |
|---------|---------------|-------------------|----------|
| **≥ 90%** | Grade A | `1.0` (100% value) | Full payout |
| **< 90%** | Grade B | `0.9` (90% value) | 10% revenue penalty |

**Example:**
- Total loot value: 1000 $SOLE
- Hygiene: 91% → **Revenue:** `1000 × 1.0 = 1000 $SOLE` ✅
- Hygiene: 89% → **Revenue:** `1000 × 0.9 = 900 $SOLE` (Loss: -100 $SOLE)

**Rationale:** Avoids annoying micro-penalties. 91% hygiene gets full price; 89% gets 10% penalty.

### Cleaning Cost Formula
```
cleaningCost = (100 - currentHygiene) × CLEAN_COST_PER_PERCENT
```

**Constants:**
- `CLEAN_COST_PER_PERCENT = 2 $SOLE` per 1% deficit

**Example:**
- Current hygiene: 85%
- Deficit: `100 - 85 = 15%`
- **Cleaning cost:** `15 × 2 = 30 $SOLE`

---

## 4. Ad Rescue & Crash Protection

### Universal Ad Rescue Logic (All Tiers)
**Trigger Condition:**
- Space available: `currentWeight + item.weight ≤ maxWeight` ✅
- Stamina insufficient: `currentStamina < item.pickupCost` ❌

**Supported Tiers:** T1, T2, T3 (not limited to T3)

### Ad Rescue Flow
1. **Trigger:** Item found, space OK, stamina low
2. **Lock Scene:** `sessionStore.setPendingEncounter(item)` (immediate persistence)
3. **Show Modal:** "Watch Ad to inject Adrenaline (+30 Stamina)"
4. **Watch Ad:** 30-second ad (most crash-prone moment)
5. **Restore Stamina:** `player.updateStamina(30)`
6. **Pickup Item:** `inventory.addItem(item)`
7. **Clear Lock:** `sessionStore.clearPendingEncounter()` (only after successful pickup)

### Crash Recovery Logic
**On App Mount:**
```typescript
if (sessionStore.currentEncounter?.status === 'PENDING_AD') {
  // Show recovery modal
  Alert.alert(
    '⚠️ Recovery Mode',
    `You were trying to rescue a **T${tier}** item before the app closed. Resume?`
  );
}
```

**Recovery Options:**
- **Resume:** Re-trigger ad rescue flow from step 3
- **Cancel:** Clear encounter (user forfeits item)

### Transactional Atomicity
- **Lock saved:** Before ad modal appears
- **Lock cleared:** Only after `addItem()` succeeds
- **Protection:** Prevents "white ad watch, no item" scenarios

---

## 5. Loot Table (T1, T2, T3)

### Item Properties
| Tier | Name | Weight (kg) | Market Value ($SOLE) | Pickup Cost (pts) | Eat Restore (pts) | Contamination (%) |
|------|------|-------------|---------------------|-------------------|------------------|------------------|
| **T1** | 琥珀粗糖 | 0.5 | 10 | 3 | 5 | -0.2% |
| **T2** | 翡翠晶糖 | 1.5 | 50 | 9 | 15 | -0.6% |
| **T3** | 皇室純糖 | 4.0 | 500 | 30 | 100 | -1.0% |

### Drop Distribution (85/14/1 Protocol)
| Tier | Base Rate | Deep Zone (10km+) | Pathfinder Bonus |
|------|-----------|------------------|------------------|
| **T1** | 85% | 85% | 85% |
| **T2** | 14% | 14% | 14% + 10% = 24% |
| **T3** | 1% | 1% × 2 = 2% | 1% (or 2% in Deep Zone) |

**Modifiers:**
- **Daily Luck Gradient:** T2 rate increases with streak (max +15% at Day 30)
- **Deep Zone:** T3 rate doubles after 10km (`DEEP_ZONE.T3_MULTIPLIER = 2`)
- **Pathfinder:** T2 rate +10% in unexplored areas

### Overflow Logic (Universal Conversion)
**Trigger:** `currentWeight + item.weight > maxWeight`

**Behavior (All Tiers):**
1. **Item NOT added** to inventory
2. **Hygiene NOT deducted** (item never enters bag)
3. **Stamina cost applied:** Pickup cost is still deducted (labor cost)
4. **Stamina restored:** Item is immediately consumed for energy
5. **Net Stamina Change:** `EatRestore - PickupCost`

**Net Energy Formula:**
| Tier | Eat Restore | Pickup Cost | Net Gain |
|------|-------------|-------------|----------|
| **T1** | +5 | -3 | **+2** |
| **T2** | +15 | -9 | **+6** |
| **T3** | +100 | -30 | **+70** |

**Example Scenario:**
- Walk 100m with full bag (10kg/10kg)
- Find T1 item
- **Movement burn:** `-2.0` (weight penalty: 2.0x)
- **Pickup cost:** `-3.0`
- **Eat restore:** `+5.0`
- **Final change:** `-2.0 - 3.0 + 5.0 = 0.0` (zero-sum)

**UI Feedback:**
- **T1:** Console log (non-intrusive)
- **T2/T3:** Warning alert: "⚠️ BAG FULL! You just consumed a T{tier} ({value} SOLE) for +{net} Stamina!"

---

## Additional Constants

### Payout Multipliers
| Mode | Multiplier | Description |
|------|------------|-------------|
| **M Normal** | 1.0x | Self-delivery |
| **M Ad (Porter)** | 2.0x | Watch ad for delivery |
| **M Info (Data)** | 10.0x | Upload photo for delivery |

### Unloading Stamina Cost
- **Cost per kg:** `2 pts/kg`
- **Example:** Unload 10kg = `10 × 2 = 20 pts`

### Ad Rescue Limits
| Type | Daily Cap | Restore Amount |
|------|-----------|----------------|
| **Adrenaline (Stamina)** | 5 | +30 pts |
| **Ghost Revival** | 5 | +30 pts |
| **Porter (Unload)** | ∞ | N/A (2.0x payout) |
| **Leave (Vacation)** | 3 days | N/A |

### Zero Tolerance Thresholds
| Stat | Threshold | Consequence |
|------|-----------|-------------|
| **Stamina** | 0 | Ghost Mode (immobilized) |
| **Durability** | 0 | Backpack Collapse (maxWeight = 0) |

---

## Summary of Key Design Principles

1. **Split-Timing Mechanism:**
   - **Hygiene:** Real-time deduction (immediate feedback)
   - **Durability:** Post-delivery settlement (safe journey)

2. **Tiered Thresholds (Forgiveness Mechanic):**
   - **Durability < 90%:** Capacity reduced to 90% (not linear)
   - **Hygiene < 90%:** Revenue reduced to 90% (not linear)
   - **Rationale:** Avoids micro-penalties, provides buffer zone

3. **Industrial Reinforcement:**
   - Weight coefficient: `0.15` (down from `0.5`)
   - Ensures profitability for high-level players (30kg bags)
   - Scaling factor: `0.1` for user-friendly percentages

4. **Universal Ad Rescue:**
   - Supports all tiers (T1/T2/T3)
   - Crash-safe with persistent encounter state
   - Transactional atomicity (lock cleared only after success)

5. **Cumulative Debt System:**
   - **Durability:** Accumulated during movement, applied at settlement
   - **Hygiene:** Real-time deduction (no debt system)
   - **Anti-Cheat:** Prevents "Load Shedding" and "Forgetting Costs" exploits

---

**Document Version:** v8.7 Final Consolidated Edition  
**Last Updated:** Based on current codebase implementation  
**Status:** Ready for Whitepaper integration

