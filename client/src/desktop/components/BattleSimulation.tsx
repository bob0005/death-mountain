import { Box, Typography } from "@mui/material";
import {
  calculateAttackDamage,
  calculateBeastDamage,
  calculateLevel,
  getNewItemsEquipped,
} from "@/utils/game";
import { useGameStore } from "@/stores/gameStore";
import { ItemId } from "@/constants/loot";
import { useMemo } from "react";

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

  // Check for pending equipment changes
  const hasPendingChanges = useMemo(() => {
    if (!adventurer?.equipment || !adventurerState?.equipment) return false;
    return (
      getNewItemsEquipped(adventurer.equipment, adventurerState.equipment)
        .length > 0
    );
  }, [adventurer?.equipment, adventurerState?.equipment]);

  if (!adventurer || adventurer.xp === 0 || !beast) return null;

  const adventurerLevel = calculateLevel(adventurer.xp);
  const beastCritChance = adventurerLevel / 100; // Convert to decimal
  const adventurerCritChance = adventurer.stats.luck / 100; // Convert to decimal

  const { baseDamage, criticalDamage } = calculateAttackDamage(
    adventurer.equipment.weapon,
    adventurer,
    beast
  );

  // Group armor by damage values
  const armorGroups = new Map<string, DamageGroup>();

  ARMOR_SLOTS.forEach((slot) => {
    const armor = adventurer.equipment[slot];
    const normalDamage = calculateBeastDamage(beast, adventurer, armor, false);
    const criticalDamage = calculateBeastDamage(beast, adventurer, armor, true);

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

  // Calculate probabilities for each group
  armorGroups.forEach((group) => {
    group.probability = group.slots.length / 5; // Each slot has 1/5 chance of being hit
  });

  // Simulate the battle process iteratively
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
    // Map: "adventurerHealth-beastHealth" -> probability
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

        // Beast is already dead - victory
        if (beastHealth <= 0) {
          totalWins += stateProbability;
          weightedDamageOnWin +=
            stateProbability * (startAdventurerHealth - advHealth);
          weightedAttemptsOnWin += stateProbability * (attempt - 1);
          continue;
        }

        // Adventurer is dead - defeat
        if (advHealth <= 0) {
          totalDeaths += stateProbability;
          continue;
        }

        // Calculate adventurer damage (0 on first attempt if equipment change)
        const adventurerDamage =
          hasEquipmentChange && attempt === 1 ? 0 : baseDamage;
        const adventurerCritDamage =
          hasEquipmentChange && attempt === 1 ? 0 : criticalDamage;

        // Adventurer attacks first - normal hit
        const normalHitChance = 1 - adventurerCritChance;
        const normalHitProb = stateProbability * normalHitChance;
        const beastHealthAfterNormal = beastHealth - adventurerDamage;

        if (beastHealthAfterNormal <= 0) {
          // Beast dies from normal hit - immediate victory
          totalWins += normalHitProb;
          weightedDamageOnWin +=
            normalHitProb * (startAdventurerHealth - advHealth);
          weightedAttemptsOnWin += normalHitProb * attempt;
        } else {
          // Beast survives normal hit and counter-attacks
          armorGroups.forEach((group) => {
            // Normal beast counter-attack
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

            // Critical beast counter-attack
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

        // Adventurer attacks first - critical hit
        const critHitProb = stateProbability * adventurerCritChance;
        const beastHealthAfterCrit = beastHealth - adventurerCritDamage;

        if (beastHealthAfterCrit <= 0) {
          // Beast dies from crit hit - immediate victory
          totalWins += critHitProb;
          weightedDamageOnWin +=
            critHitProb * (startAdventurerHealth - advHealth);
          weightedAttemptsOnWin += critHitProb * attempt;
        } else {
          // Beast survives crit hit and counter-attacks
          armorGroups.forEach((group) => {
            // Normal beast counter-attack after adventurer crit
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

            // Critical beast counter-attack after adventurer crit
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

      // Early termination conditions
      const remainingProbability = Array.from(currentStates.values()).reduce(
        (a, b) => a + b,
        0
      );

      // Stop if no states remain or probability is negligible
      if (currentStates.size === 0 || remainingProbability < 0.0001) {
        break;
      }

      // Stop if we've resolved most outcomes (99.99% won or died)
      if (totalWins + totalDeaths > 0.9999) {
        console.log(
          `Battle simulation terminated early at attempt ${attempt}: resolved ${(
            (totalWins + totalDeaths) *
            100
          ).toFixed(2)}% of outcomes`
        );
        break;
      }

      // For high damage scenarios, stop early if unlikely to continue much longer
      if (
        baseDamage >= beast.health / 5 &&
        attempt >= 20 &&
        remainingProbability < 0.01
      ) {
        console.log(
          `Battle simulation terminated early at attempt ${attempt}: high damage (${baseDamage}) with low remaining probability (${(
            remainingProbability * 100
          ).toFixed(3)}%)`
        );
        break;
      }
    }

    // Handle remaining states as deaths (hit MAX_ATTEMPTS)
    const hitMaxAttempts = currentStates.size > 0;
    for (const [stateKey, probability] of currentStates) {
      totalDeaths += probability;
    }

    return {
      survivalProbability: totalWins,
      deathProbability: totalDeaths,
      averageDamageOnWin: totalWins > 0 ? weightedDamageOnWin / totalWins : 0,
      averageAttemptsToWin:
        totalWins > 0 ? weightedAttemptsOnWin / totalWins : 0,
      attempts: 0, // Not used in iterative version
      hitMaxAttempts,
    };
  };

  const simulationResult = simulateBattleIterative(
    adventurer.health,
    beast.health,
    hasPendingChanges
  );
  const beastPower = beast.level * (6 - beast.tier);

  console.log("Simulation result:", {
    attempts: simulationResult.attempts,
    survivalProb: simulationResult.survivalProbability,
    deathProb: simulationResult.deathProbability,
    avgAttemptsToWin: simulationResult.averageAttemptsToWin,
  });

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
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Avg Attempts:</Typography>
          <Typography sx={styles.statValue}>
            {simulationResult.averageAttemptsToWin.toFixed(1)}
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Gold Reward:</Typography>
          <Typography sx={styles.goldValue}>
            {adventurer.equipment.ring.id === ItemId.GoldRing
              ? Math.floor(
                  Math.floor(beastPower / 2) + (Math.floor(beastPower / 2) *
                    0.03 *
                    calculateLevel(adventurer.equipment.ring.xp))
                )
              : Math.floor(beastPower / 2)}
          </Typography>
        </Box>
      </Box>

      {simulationResult.hitMaxAttempts && (
        <Typography sx={styles.maxAttemptsWarning}>
          ⚠️ Extended simulation (50+ attempts) - high confidence results
        </Typography>
      )}

      {hasPendingChanges && (
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
    padding: "4px 0",
  },
  statLabel: {
    color: "#b8b8b8",
    fontSize: "0.9rem",
  },
  statValue: {
    fontWeight: "600",
    fontSize: "1rem",
    color: "#ffb347",
  },
  goldValue: {
    fontWeight: "600",
    fontSize: "1rem",
    color: "#EDCF33",
  },
  maxAttemptsWarning: {
    color: "#4caf50",
    fontSize: "0.8rem",
    textAlign: "center",
    marginTop: "8px",
    fontWeight: "normal",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
    fontStyle: "italic",
  },
  equipmentWarning: {
    color: "#ff9800",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "8px",
    fontStyle: "italic",
  },
};
