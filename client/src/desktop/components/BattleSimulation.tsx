import { Box, Typography } from "@mui/material";
import {
  calculateAttackDamage,
  calculateBeastDamage,
  calculateLevel,
  calculateNextLevelXP,
  getNewItemsEquipped,
} from "@/utils/game";
import { useGameStore } from "@/stores/gameStore";
import { ItemId } from "@/constants/loot";
import { useMemo } from "react";
import { getXpReward } from "@/utils/processFutures";

const ARMOR_SLOTS = ["head", "chest", "waist", "foot", "hand"] as const;

interface DamageGroup {
  slots: string[];
  normalDamage: number;
  criticalDamage: number;
  probability: number;
}

const MAX_ATTEMPTS = 50;

export const BattleSimulation = () => {
  const { adventurer, beast, adventurerState } = useGameStore();

  const hasEquipmentChange = useMemo(() => {
    if (!adventurer?.equipment || !adventurerState?.equipment) return false;

    return (
      getNewItemsEquipped(adventurer.equipment, adventurerState.equipment)
        .length > 0
    );
  }, [adventurer?.equipment, adventurerState?.equipment]);

  if (!adventurer || adventurer.xp === 0 || !beast) return null;

  const adventurerLevel = calculateLevel(adventurer.xp);
  const beastCritChance = adventurerLevel / 100;
  const adventurerCritChance = Math.min(adventurer.stats.luck, 100) / 100;

  const { baseDamage, criticalDamage } = calculateAttackDamage(
    adventurer.equipment.weapon,
    adventurer,
    beast
  );

  const beastPower = beast.level * (6 - beast.tier);
  const adventurerXpReward = Number(
    getXpReward(BigInt(beast.level), BigInt(beast.tier), adventurerLevel)
  );

  const currentLevel = calculateLevel(adventurer.xp);
  const nextLevelXp = calculateNextLevelXP(currentLevel);
  const willLevelUp = adventurer.xp + adventurerXpReward >= nextLevelXp;
  const newLevel = willLevelUp
    ? calculateLevel(adventurer.xp + adventurerXpReward)
    : currentLevel;

  const armorGroups = new Map<string, DamageGroup>();

  ARMOR_SLOTS.forEach((slot) => {
    const armor = adventurer.equipment[slot];
    const beastDamage = calculateBeastDamage(beast, adventurer, armor);
    const normalDamage = beastDamage.baseDamage;
    const criticalDamage = beastDamage.criticalDamage;

    const key = `${normalDamage}-${criticalDamage}`;

    if (!armorGroups.has(key)) {
      armorGroups.set(key, {
        slots: [],
        normalDamage,
        criticalDamage,
        probability: 0,
      });
    }

    armorGroups.get(key)!.slots.push(slot);
  });

  armorGroups.forEach((group) => {
    group.probability = group.slots.length / 5;
  });

  const simulateBattleIterative = (
    startAdventurerHealth: number,
    startBeastHealth: number,
    hasEquipmentChange: boolean = false
  ): {
    survivalProbability: number;
    deathProbability: number;
    averageDamageOnWin: number;
    averageAttemptsToWin: number;
    attempts: number;
    hitMaxAttempts: boolean;
  } => {
    let currentStates = new Map<string, number>();
    currentStates.set(`${startAdventurerHealth}-${startBeastHealth}`, 1.0);

    let totalWins = 0;
    let totalDeaths = 0;
    let weightedDamageOnWin = 0;
    let weightedAttemptsOnWin = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const nextStates = new Map<string, number>();

      for (const [stateKey, stateProbability] of currentStates) {
        const [advHealthStr, beastHealthStr] = stateKey.split("-");
        const advHealth = parseInt(advHealthStr);
        const beastHealth = parseInt(beastHealthStr);

        if (beastHealth <= 0) {
          totalWins += stateProbability;
          weightedDamageOnWin +=
            stateProbability * (startAdventurerHealth - advHealth);
          weightedAttemptsOnWin += stateProbability * (attempt - 1);
          continue;
        }

        if (advHealth <= 0) {
          totalDeaths += stateProbability;
          continue;
        }

        const adventurerDamage =
          hasEquipmentChange && attempt === 1 ? 0 : baseDamage;
        const adventurerCritDamage =
          hasEquipmentChange && attempt === 1 ? 0 : criticalDamage;

        const normalHitChance = 1 - adventurerCritChance;
        const normalHitProb = stateProbability * normalHitChance;
        const beastHealthAfterNormal = beastHealth - adventurerDamage;

        if (beastHealthAfterNormal <= 0) {
          totalWins += normalHitProb;
          weightedDamageOnWin +=
            normalHitProb * (startAdventurerHealth - advHealth);
          weightedAttemptsOnWin += normalHitProb * attempt;
        } else {
          armorGroups.forEach((group) => {
            const beastNormalProb =
              normalHitProb * group.probability * (1 - beastCritChance);
            const advHealthAfterNormal = advHealth - group.normalDamage;

            if (advHealthAfterNormal <= 0) {
              totalDeaths += beastNormalProb;
            } else {
              const newStateKey = `${advHealthAfterNormal}-${beastHealthAfterNormal}`;
              const existing = nextStates.get(newStateKey) || 0;
              nextStates.set(newStateKey, existing + beastNormalProb);
            }

            const beastCritProb =
              normalHitProb * group.probability * beastCritChance;
            const advHealthAfterCrit = advHealth - group.criticalDamage;

            if (advHealthAfterCrit <= 0) {
              totalDeaths += beastCritProb;
            } else {
              const newStateKey = `${advHealthAfterCrit}-${beastHealthAfterNormal}`;
              const existing = nextStates.get(newStateKey) || 0;
              nextStates.set(newStateKey, existing + beastCritProb);
            }
          });
        }

        const critHitProb = stateProbability * adventurerCritChance;
        const beastHealthAfterCrit = beastHealth - adventurerCritDamage;

        if (beastHealthAfterCrit <= 0) {
          totalWins += critHitProb;
          weightedDamageOnWin +=
            critHitProb * (startAdventurerHealth - advHealth);
          weightedAttemptsOnWin += critHitProb * attempt;
        } else {
          armorGroups.forEach((group) => {
            const beastNormalProb =
              critHitProb * group.probability * (1 - beastCritChance);
            const advHealthAfterNormal = advHealth - group.normalDamage;

            if (advHealthAfterNormal <= 0) {
              totalDeaths += beastNormalProb;
            } else {
              const newStateKey = `${advHealthAfterNormal}-${beastHealthAfterCrit}`;
              const existing = nextStates.get(newStateKey) || 0;
              nextStates.set(newStateKey, existing + beastNormalProb);
            }

            const beastCritProb =
              critHitProb * group.probability * beastCritChance;
            const advHealthAfterCrit = advHealth - group.criticalDamage;

            if (advHealthAfterCrit <= 0) {
              totalDeaths += beastCritProb;
            } else {
              const newStateKey = `${advHealthAfterCrit}-${beastHealthAfterCrit}`;
              const existing = nextStates.get(newStateKey) || 0;
              nextStates.set(newStateKey, existing + beastCritProb);
            }
          });
        }
      }

      currentStates = nextStates;

      const remainingProbability = Array.from(currentStates.values()).reduce(
        (a, b) => a + b,
        0
      );

      if (currentStates.size === 0 || remainingProbability < 0.0001) {
        break;
      }

      if (totalWins + totalDeaths > 0.9999) {
        break;
      }

      if (
        baseDamage >= beast.health / 5 &&
        attempt >= 20 &&
        remainingProbability < 0.01
      ) {
        break;
      }
    }

    const hitMaxAttempts = currentStates.size > 0;
    for (const [, probability] of currentStates) {
      totalDeaths += probability;
    }

    return {
      survivalProbability: totalWins,
      deathProbability: totalDeaths,
      averageDamageOnWin: totalWins > 0 ? weightedDamageOnWin / totalWins : 0,
      averageAttemptsToWin:
        totalWins > 0 ? weightedAttemptsOnWin / totalWins : 0,
      attempts: 0,
      hitMaxAttempts,
    };
  };

  const currentBeastHealth =
    adventurer.beast_health > 0 ? adventurer.beast_health : beast.health;

  const simulationResult = simulateBattleIterative(
    adventurer.health,
    currentBeastHealth,
    hasEquipmentChange
  );

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>⚔️ Battle Simulation</Typography>

      <Box sx={styles.statsGrid}>
        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Survival Rate:</Typography>
          <Typography
            sx={{
              ...styles.statValue,
              color:
                simulationResult.survivalProbability >= 0.8
                  ? "#4caf50"
                  : simulationResult.survivalProbability >= 0.5
                  ? "#ffc107"
                  : "#ff6b6b",
            }}
          >
            {(simulationResult.survivalProbability * 100).toFixed(1)}%
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Death Rate:</Typography>
          <Typography
            sx={{
              ...styles.statValue,
              color:
                simulationResult.deathProbability >= 0.5
                  ? "#ff6b6b"
                  : simulationResult.deathProbability >= 0.2
                  ? "#ffc107"
                  : "#4caf50",
            }}
          >
            {(simulationResult.deathProbability * 100).toFixed(1)}%
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Avg Damage (Win):</Typography>
          <Typography sx={styles.statValue}>
            {simulationResult.averageDamageOnWin.toFixed(1)} HP
            {adventurer.beast_health > 0 &&
              adventurer.beast_health < beast.health && (
                <Typography component="span" sx={styles.damageNote}>
                  {` (from current state)`}
                </Typography>
              )}
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Avg Attempts:</Typography>
          <Typography sx={styles.statValue}>
            {simulationResult.averageAttemptsToWin.toFixed(1)}
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>XP Reward:</Typography>
          <Typography sx={styles.xpValue}>
            +{adventurerXpReward} XP
            {willLevelUp && (
              <Typography component="span" sx={styles.levelUpNote}>
                {` → Level ${newLevel}!`}
              </Typography>
            )}
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Gold Reward:</Typography>
          <Typography sx={styles.goldValue}>
            {adventurer.equipment.ring.id === ItemId.GoldRing
              ? Math.floor(
                  Math.floor(beastPower / 2) +
                    Math.floor(beastPower / 2) *
                      0.03 *
                      calculateLevel(adventurer.equipment.ring.xp)
                )
              : Math.floor(beastPower / 2)}
          </Typography>
        </Box>
      </Box>

      {hasEquipmentChange && (
        <Typography sx={styles.equipmentWarning}>
          ⚡ Equipment changes cause 0 damage this turn
        </Typography>
      )}
    </Box>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    border: "2px solid #ff6b6b",
    borderRadius: "8px",
    background: "rgba(255, 107, 107, 0.1)",
    width: "100%",
    boxSizing: "border-box",
  },
  title: {
    color: "#ff6b6b",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "8px",
  },
  statsGrid: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    width: "100%",
  },
  statItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    minHeight: "20px",
  },
  statLabel: {
    color: "#b8b8b8",
    fontSize: "0.85rem",
    flex: "1",
    marginRight: "8px",
  },
  statValue: {
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "#ffb347",
    flex: "0 0 auto",
    textAlign: "right",
  },
  xpValue: {
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "#4caf50",
    flex: "0 0 auto",
    textAlign: "right",
  },
  goldValue: {
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "#EDCF33",
    flex: "0 0 auto",
    textAlign: "right",
  },
  equipmentWarning: {
    color: "#ff9800",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "8px",
    fontStyle: "italic",
  },
  damageNote: {
    color: "#888",
    fontSize: "0.75rem",
    fontStyle: "italic",
  },
  levelUpNote: {
    color: "#4caf50",
    fontSize: "0.75rem",
    fontWeight: "bold",
    marginLeft: "4px",
  },
};
