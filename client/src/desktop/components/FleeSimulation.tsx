import { Box, Typography } from "@mui/material";
import {
  calculateBeastDamage,
  calculateLevel,
  getNewItemsEquipped,
} from "@/utils/game";
import { Adventurer, Beast } from "@/types/game";
import { useGameStore } from "@/stores/gameStore";
import { useMemo } from "react";

interface DamageGroup {
  slots: string[];
  normalDamage: number;
  criticalDamage: number;
  probability: number;
}

const MAX_ATTEMPTS = 50;

export const FleeSimulation = ({
  adventurer,
  beast,
}: {
  adventurer: Adventurer;
  beast: Beast;
}) => {
  const { adventurerState } = useGameStore();
  const hasPendingChanges = useMemo(() => {
    if (!adventurer?.equipment || !adventurerState?.equipment) return false;

    return (
      getNewItemsEquipped(adventurer.equipment, adventurerState.equipment)
        .length > 0
    );
  }, [adventurer?.equipment, adventurerState?.equipment]);

  const adventurerLevel = calculateLevel(adventurer.xp);
  const beastCritChance = adventurerLevel / 100;
  const fleeChance = Math.min(
    (adventurer.stats.dexterity / adventurerLevel) * 100,
    100
  );

  if (fleeChance >= 100) {
    return (
      <Box
        sx={{
          padding: 2,
          backgroundColor: "rgba(76, 175, 80, 0.1)",
          borderRadius: 2,
        }}
      >
        <Typography sx={{ color: "#4caf50", fontWeight: "bold" }}>
          ✓ Guaranteed Escape (100% flee chance)
        </Typography>
      </Box>
    );
  } else if (fleeChance <= 0) {
    return (
      <Box
        sx={{
          padding: 2,
          backgroundColor: "rgba(255, 65, 54, 0.1)",
          borderRadius: 2,
        }}
      >
        <Typography sx={{ color: "#ff4136", fontWeight: "bold" }}>
          ✗ Impossible Escape (0% flee chance)
        </Typography>
      </Box>
    );
  }

  const armorSlots = ["head", "chest", "waist", "hand", "foot"] as const;
  const armorGroups = new Map<string, DamageGroup>();

  armorSlots.forEach((slot) => {
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

  console.log(armorGroups);

  const simulateFleeIterative = (
    startHealth: number,
    hasEquipmentChange: boolean = false
  ): {
    deathProbability: number;
    escapeProbability: number;
    averageDamageOnEscape: number;
    averageAttemptsToEscape: number;
    hitMaxAttempts: boolean;
  } => {
    let currentStates = new Map<number, number>();
    currentStates.set(startHealth, 1.0);

    let totalEscaped = 0;
    let totalDied = 0;
    let weightedDamageOnEscape = 0;
    let weightedAttemptsOnEscape = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const nextStates = new Map<number, number>();

      for (const [health, stateProbability] of currentStates) {
        const fleeSuccessChance =
          hasEquipmentChange && attempt === 1 ? 0 : fleeChance / 100;
        const escapeProb = stateProbability * fleeSuccessChance;

        if (escapeProb > 0) {
          totalEscaped += escapeProb;
          weightedDamageOnEscape += escapeProb * (startHealth - health);
          weightedAttemptsOnEscape += escapeProb * attempt;
        }

        const failProb = stateProbability * (1 - fleeSuccessChance);

        if (failProb > 0) {
          armorGroups.forEach((group) => {
            const normalHitProb =
              failProb * group.probability * (1 - beastCritChance);
            const healthAfterNormal = health - group.normalDamage;

            if (healthAfterNormal <= 0) {
              totalDied += normalHitProb;
            } else {
              const existing = nextStates.get(healthAfterNormal) || 0;
              nextStates.set(healthAfterNormal, existing + normalHitProb);
            }

            const critHitProb = failProb * group.probability * beastCritChance;
            const healthAfterCrit = health - group.criticalDamage;

            if (healthAfterCrit <= 0) {
              totalDied += critHitProb;
            } else {
              const existing = nextStates.get(healthAfterCrit) || 0;
              nextStates.set(healthAfterCrit, existing + critHitProb);
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

      if (totalEscaped + totalDied > 0.9999) {
        console.log(
          `Flee simulation terminated early at attempt ${attempt}: resolved ${(
            (totalEscaped + totalDied) *
            100
          ).toFixed(2)}% of outcomes`
        );
        break;
      }

      if (fleeChance >= 80 && attempt >= 10 && remainingProbability < 0.01) {
        console.log(
          `Flee simulation terminated early at attempt ${attempt}: high flee chance (${fleeChance.toFixed(
            1
          )}%) with low remaining probability (${(
            remainingProbability * 100
          ).toFixed(3)}%)`
        );
        break;
      }
    }

    const hitMaxAttempts = currentStates.size > 0;
    for (const [, probability] of currentStates) {
      totalDied += probability;
    }

    return {
      deathProbability: totalDied,
      escapeProbability: totalEscaped,
      averageDamageOnEscape:
        totalEscaped > 0 ? weightedDamageOnEscape / totalEscaped : 0,
      averageAttemptsToEscape:
        totalEscaped > 0 ? weightedAttemptsOnEscape / totalEscaped : 0,
      hitMaxAttempts,
    };
  };

  const simulationResult = simulateFleeIterative(
    adventurer.health,
    hasPendingChanges
  );
  const totalDeathProbability = simulationResult.deathProbability;

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>⚡ Flee Simulation</Typography>

      <Box sx={styles.statsGrid}>
        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Overall Escape Chance:</Typography>
          <Typography
            sx={{
              ...styles.statValue,
              color:
                simulationResult.escapeProbability * 100 >= 80
                  ? "#4caf50"
                  : simulationResult.escapeProbability * 100 >= 50
                  ? "#ffc107"
                  : "#ff6b6b",
            }}
          >
            {(simulationResult.escapeProbability * 100).toFixed(1)}%
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Death Risk:</Typography>
          <Typography
            sx={{
              ...styles.statValue,
              color:
                totalDeathProbability * 100 >= 10
                  ? "#ff6b6b"
                  : totalDeathProbability * 100 >= 5
                  ? "#ffc107"
                  : "#4caf50",
            }}
          >
            {(totalDeathProbability * 100).toFixed(2)}%
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Avg Damage if Escaped:</Typography>
          <Typography sx={styles.statValue}>
            {simulationResult.averageDamageOnEscape.toFixed(1)} HP
          </Typography>
        </Box>

        <Box sx={styles.statItem}>
          <Typography sx={styles.statLabel}>Avg Attempts:</Typography>
          <Typography sx={styles.statValue}>
            {simulationResult.averageAttemptsToEscape.toFixed(1)}
          </Typography>
        </Box>
      </Box>

      {hasPendingChanges && (
        <Typography sx={styles.equipmentWarning}>
          ⚡ Equipment changes trigger beast attack
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
    border: "2px solid #4ecdc4",
    borderRadius: "8px",
    background: "rgba(78, 205, 196, 0.1)",
    width: "100%",
    boxSizing: "border-box",
  },
  title: {
    color: "#4ecdc4",
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
  equipmentWarning: {
    color: "#ff9800",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "8px",
    fontStyle: "italic",
  },
};
