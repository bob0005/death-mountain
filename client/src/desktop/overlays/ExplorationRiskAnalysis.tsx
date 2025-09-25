import { Box, Typography } from "@mui/material";
import { useGameStore } from "@/stores/gameStore";
import { useMemo } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { STARTING_HEALTH } from "@/constants/game";
import {
  addStats,
  calculateAmbushRisk,
  calculateObstacleRisk,
} from "@/utils/explorationRiskAnalysis";
import { calculateLevel } from "@/utils/game";

const DISCOVERY_PROBABILITY = 33.3;
const GOLD_PROBABILITY = (DISCOVERY_PROBABILITY * 45) / 100;
const HEALTH_PROBABILITY = (DISCOVERY_PROBABILITY * 45) / 100;
const LOOT_PROBABILITY = (DISCOVERY_PROBABILITY * 10) / 100;

export default function ExplorationRiskAnalysisOverlay() {
  const { adventurer, selectedStats } = useGameStore();
  const { cart } = useMarketStore();

  const updatedAdventurer = useMemo(() => {
    if (!adventurer) return null;

    const healthFromPotions = cart.potions * 10;
    const maxHealth =
      STARTING_HEALTH +
      (adventurer.stats.vitality + selectedStats.vitality) * 15;

    const updatedHealth = Math.min(
      adventurer.health + healthFromPotions + selectedStats.vitality * 15,
      maxHealth
    );

    return {
      ...adventurer,
      health: updatedHealth,
      stats: addStats(adventurer.stats, selectedStats),
    };
  }, [adventurer, cart.potions, selectedStats]);

  if (!updatedAdventurer) return null;

  const adventurerLvl = calculateLevel(updatedAdventurer.xp);

  const ambushResult = calculateAmbushRisk(updatedAdventurer);
  const obstacleResult = calculateObstacleRisk(updatedAdventurer);

  const cumulativeDeathProbability =
    ambushResult.instantDeathProbability +
    obstacleResult.instantDeathProbability;
  const cumulativeAvgDamage =
    (ambushResult.avgNonFatalDamage + obstacleResult.avgNonFatalDamage) / 2;

  return (
    <Box sx={styles.container}>
      <Typography variant="h6" sx={styles.title}>
        Exploration Risk Analysis
      </Typography>

      <Box sx={styles.riskSection}>
        <Box sx={styles.riskRow}>
          <Box sx={styles.riskItem}>
            <Typography variant="body2" sx={styles.riskLabel}>
              Ambush
            </Typography>
            <Typography
              variant="h5"
              sx={{
                ...styles.riskPercentage,
                color:
                  ambushResult.instantDeathProbability > 10
                    ? "#ff6b6b"
                    : ambushResult.instantDeathProbability > 5
                    ? "#ffd93d"
                    : "#4ecdc4",
              }}
            >
              {ambushResult.instantDeathProbability.toFixed(1)}%
            </Typography>
          </Box>

          <Box sx={styles.riskItem}>
            <Typography variant="body2" sx={styles.riskLabel}>
              Obstacle
            </Typography>
            <Typography
              variant="h5"
              sx={{
                ...styles.riskPercentage,
                color:
                  obstacleResult.instantDeathProbability > 10
                    ? "#ff6b6b"
                    : obstacleResult.instantDeathProbability > 5
                    ? "#ffd93d"
                    : "#4ecdc4",
              }}
            >
              {obstacleResult.instantDeathProbability.toFixed(1)}%
            </Typography>
          </Box>
        </Box>

        {/* AVG DAMAGE BELOW */}
        <Box sx={styles.avgDamageRow}>
          <Box sx={styles.avgDamageItem}>
            <Typography variant="caption" sx={styles.avgDamageLabel}>
              Avg Dmg:
            </Typography>
            <Typography variant="body2" sx={styles.avgDamageValue}>
              {ambushResult.avgNonFatalDamage} HP
            </Typography>
          </Box>

          <Box sx={styles.avgDamageItem}>
            <Typography variant="caption" sx={styles.avgDamageLabel}>
              Avg Dmg:
            </Typography>
            <Typography variant="body2" sx={styles.avgDamageValue}>
              {obstacleResult.avgNonFatalDamage} HP
            </Typography>
          </Box>
        </Box>

        <Box sx={styles.cumulativeBox}>
          <Typography variant="body2" sx={styles.riskLabel}>
            Total Death Risk:
          </Typography>
          <Typography
            variant="h4"
            sx={{
              ...styles.cumulativePercentage,
              color:
                cumulativeDeathProbability > 20
                  ? "#ff6b6b"
                  : cumulativeDeathProbability > 10
                  ? "#ffd93d"
                  : "#4ecdc4",
            }}
          >
            {cumulativeDeathProbability.toFixed(1)}%
          </Typography>
          <Box
            sx={{
              ...styles.avgDamageItem,
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Typography variant="caption" sx={styles.avgDamageLabel}>
              Avg Damage:
            </Typography>
            <Typography variant="body2" sx={styles.cumulativeDamage}>
              {cumulativeAvgDamage.toFixed(1)} HP
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* DISCOVERY */}
      <Box sx={styles.discoveryBox}>
        <Typography variant="subtitle1" sx={styles.discoveryTitle}>
          Discovery Rewards
        </Typography>

        <Box sx={styles.discoveryStats}>
          <Box sx={styles.discoveryItem}>
            <Typography variant="body2" sx={styles.discoveryLabel}>
              Gold ({GOLD_PROBABILITY.toFixed(1)}%)
            </Typography>
            <Typography variant="subtitle1" sx={styles.discoveryValue}>
              ~{(1 + adventurerLvl) / 2} gold
            </Typography>
          </Box>

          <Box sx={styles.discoveryItem}>
            <Typography variant="body2" sx={styles.discoveryLabel}>
              Health ({HEALTH_PROBABILITY.toFixed(1)}%)
            </Typography>
            <Typography variant="subtitle1" sx={styles.discoveryValue}>
              ~{1 + adventurerLvl} HP
            </Typography>
          </Box>

          <Box sx={styles.discoveryItem}>
            <Typography variant="body2" sx={styles.discoveryLabel}>
              Loot ({LOOT_PROBABILITY.toFixed(1)}%)
            </Typography>
            <Typography variant="subtitle1" sx={styles.discoveryValue}>
              T1-T5 items
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const styles = {
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "16px 16px",
    border: "2px solid #083e22",
    borderRadius: "12px",
    background: "rgba(24, 40, 24, 0.95)",
    backdropFilter: "blur(8px)",
    width: "300px",
    maxHeight: "85vh",
  },
  title: {
    color: "#4ecdc4",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  riskSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    width: "90%",
    border: "2px solid #ff6b6b",
    borderRadius: "8px",
    padding: "10px",
    background: "rgba(255, 107, 107, 0.1)",
  },
  riskRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    gap: "16px",
  },
  riskItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    flex: 1,
  },
  riskLabel: {
    color: "#ff6b6b",
    fontWeight: "bold",
    fontSize: "0.9rem",
  },
  riskPercentage: {
    fontWeight: "bold",
    fontSize: "1.8rem",
  },
  avgDamageRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    gap: "16px",
    marginTop: "4px",
  },
  avgDamageItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
    flex: 1,
  },
  avgDamageLabel: {
    color: "#e0e0e0",
    fontSize: "0.75rem",
  },
  avgDamageValue: {
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "#ffb347",
  },
  cumulativeBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    marginTop: "8px",
    padding: "8px",
    borderRadius: "6px",
    width: "100%",
  },
  cumulativePercentage: {
    fontWeight: "bold",
    fontSize: "2rem",
  },
  cumulativeDamage: {
    color: "#ffb347",
    fontSize: "0.9rem",
    fontWeight: "600",
  },

  discoveryBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    width: "90%",
    border: "2px solid #4ecdc4",
    borderRadius: "8px",
    padding: "12px",
    background: "rgba(78, 205, 196, 0.1)",
  },
  discoveryTitle: {
    color: "#4ecdc4",
    fontWeight: "bold",
    textAlign: "center",
  },
  discoveryStats: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    width: "100%",
  },
  discoveryItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  discoveryLabel: {
    color: "#b8b8b8",
    fontSize: "0.9rem",
  },
  discoveryValue: {
    fontWeight: "600",
    fontSize: "1.1rem",
    color: "#ffb347",
  },
};
