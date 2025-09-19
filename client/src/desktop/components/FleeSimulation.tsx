import { Box, Typography } from "@mui/material";
import { calculateBeastDamage, calculateLevel, getNewItemsEquipped } from "@/utils/game";
import { Adventurer, Beast } from "@/types/game";
import { useGameStore } from "@/stores/gameStore";
import { useMemo } from "react";

interface DamageGroup {
  slots: string[];
  normalDamage: number;
  criticalDamage: number;
  probability: number;
}

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
    return getNewItemsEquipped(adventurer.equipment, adventurerState.equipment).length > 0;
  }, [adventurer?.equipment, adventurerState?.equipment]);


  const adventurerLevel = calculateLevel(adventurer.xp);
  const beastCritChance = adventurerLevel / 100; // Convert to decimal
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

  // Group armor by damage values
  armorSlots.forEach((slot) => {
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

  console.log(armorGroups);

  // Simulate the flee process recursively
  const simulateFleeAttempts = (currentHealth: number, attempts: number = 0, hasEquipmentChange: boolean = false): {
    deathProbability: number;
    escapeProbability: number;
    averageDamageOnEscape: number;
    averageAttemptsToEscape: number;
  } => {
    if (attempts > 10) {
      // Prevent infinite recursion - after 10 attempts, assume death
      return { deathProbability: 1, escapeProbability: 0, averageDamageOnEscape: 0, averageAttemptsToEscape: 0 };
    }

    // If there's an equipment change, treat as 0% flee chance (guaranteed fail)
    const fleeSuccessChance = hasEquipmentChange ? 0 : fleeChance / 100;
    
    // Base case: try to flee
    const escapeResult = {
      deathProbability: 0,
      escapeProbability: fleeSuccessChance,
      averageDamageOnEscape: adventurer.health - currentHealth,
      averageAttemptsToEscape: attempts + 1
    };

    // If flee fails, calculate damage scenarios
    const fleeFailChance = 1 - fleeSuccessChance;
    let failScenarios = {
      deathProbability: 0,
      escapeProbability: 0,
      averageDamageOnEscape: 0,
      averageAttemptsToEscape: 0
    };

    armorGroups.forEach((group) => {
      // Normal hit scenario
      const normalHitProb = group.probability * (1 - beastCritChance) * fleeFailChance;
      const healthAfterNormalHit = currentHealth - group.normalDamage;
      
      if (healthAfterNormalHit <= 0) {
        // Death from normal hit
        failScenarios.deathProbability += normalHitProb;
      } else {
        // Survive normal hit, continue fleeing (equipment change only applies to first attempt)
        const recursiveResult = simulateFleeAttempts(healthAfterNormalHit, attempts + 1, false);
        failScenarios.deathProbability += normalHitProb * recursiveResult.deathProbability;
        failScenarios.escapeProbability += normalHitProb * recursiveResult.escapeProbability;
        failScenarios.averageDamageOnEscape += normalHitProb * recursiveResult.averageDamageOnEscape;
        failScenarios.averageAttemptsToEscape += normalHitProb * recursiveResult.averageAttemptsToEscape;
      }

      // Critical hit scenario
      const critHitProb = group.probability * beastCritChance * fleeFailChance;
      const healthAfterCritHit = currentHealth - group.criticalDamage;
      
      if (healthAfterCritHit <= 0) {
        // Death from critical hit
        failScenarios.deathProbability += critHitProb;
      } else {
        // Survive critical hit, continue fleeing (equipment change only applies to first attempt)
        const recursiveResult = simulateFleeAttempts(healthAfterCritHit, attempts + 1, false);
        failScenarios.deathProbability += critHitProb * recursiveResult.deathProbability;
        failScenarios.escapeProbability += critHitProb * recursiveResult.escapeProbability;
        failScenarios.averageDamageOnEscape += critHitProb * recursiveResult.averageDamageOnEscape;
        failScenarios.averageAttemptsToEscape += critHitProb * recursiveResult.averageAttemptsToEscape;
      }
    });

    return {
      deathProbability: failScenarios.deathProbability,
      escapeProbability: escapeResult.escapeProbability + failScenarios.escapeProbability,
      averageDamageOnEscape: (escapeResult.escapeProbability * escapeResult.averageDamageOnEscape + 
                              failScenarios.averageDamageOnEscape) / 
                             (escapeResult.escapeProbability + failScenarios.escapeProbability || 1),
      averageAttemptsToEscape: (escapeResult.escapeProbability * escapeResult.averageAttemptsToEscape + 
                                failScenarios.averageAttemptsToEscape) / 
                               (escapeResult.escapeProbability + failScenarios.escapeProbability || 1)
    };
  };

  const simulationResult = simulateFleeAttempts(adventurer.health, 0, hasPendingChanges);
  const totalDeathProbability = simulationResult.deathProbability;

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>⚡ Flee Simulation</Typography>

      <Typography sx={styles.stat}>
        Flee Chance (per attempt):{" "}
        <span
          style={{
            color:
              fleeChance >= 80
                ? "#4caf50"
                : fleeChance >= 50
                ? "#ffc107"
                : "#ff6b6b",
          }}
        >
          {fleeChance.toFixed(1)}%
        </span>
      </Typography>

      <Typography sx={styles.stat}>
        Overall Escape Chance:{" "}
        <span
          style={{
            color:
              simulationResult.escapeProbability * 100 >= 80
                ? "#4caf50"
                : simulationResult.escapeProbability * 100 >= 50
                ? "#ffc107"
                : "#ff6b6b",
          }}
        >
          {(simulationResult.escapeProbability * 100).toFixed(1)}%
        </span>
      </Typography>

      <Typography sx={styles.stat}>
        Death Risk:{" "}
        <span
          style={{
            color:
              totalDeathProbability * 100 >= 10
                ? "#ff6b6b"
                : totalDeathProbability * 100 >= 5
                ? "#ffc107"
                : "#4caf50",
          }}
        >
          {(totalDeathProbability * 100).toFixed(2)}%
        </span>
      </Typography>

      <Typography sx={styles.stat}>
        Avg Damage if Escaped:{" "}
        <span style={{ color: "#ffc107" }}>
          {simulationResult.averageDamageOnEscape.toFixed(1)}
        </span>
      </Typography>

      <Typography sx={styles.stat}>
        Avg Attempts to Escape:{" "}
        <span style={{ color: "#ffc107" }}>
          {simulationResult.averageAttemptsToEscape.toFixed(1)}
        </span>
      </Typography>

      {hasPendingChanges && (
        <Typography sx={{ ...styles.stat, color: "#ff9800", marginTop: 1 }}>
          ⚡ Equipment changes trigger beast attack
        </Typography>
      )}

      <Box sx={{ marginTop: 1 }}>
        <Typography sx={{ ...styles.stat, fontSize: "0.8rem", color: "#aaa" }}>
          Damage Groups:
        </Typography>
        {Array.from(armorGroups.values()).map((group, index) => (
          <Typography
            key={index}
            sx={{ ...styles.stat, fontSize: "0.8rem", color: "#ccc" }}
          >
            {group.slots.join(", ")}: {group.normalDamage}/
            {group.criticalDamage} dmg ({(group.probability * 100).toFixed(0)}%)
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

const styles = {
  container: {
    padding: 2,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderRadius: 2,
    border: "1px solid rgba(255, 193, 7, 0.3)",
  },
  title: {
    color: "#ffc107",
    fontWeight: "bold",
    marginBottom: 1,
  },
  stat: {
    color: "#fff",
    fontSize: "0.9rem",
    marginBottom: 0.5,
  },
  danger: {
    color: "#ff6b6b",
    fontWeight: "bold",
  },
  safe: {
    color: "#4caf50",
    fontWeight: "bold",
  },
};