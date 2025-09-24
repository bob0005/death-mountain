import { Box, Typography, LinearProgress } from "@mui/material";
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

const DISCOVERY_PROBABILITY = 33;
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
      // beast_health: ,
      // stat_upgrades_available: ,
      // equipment: {} ,
    };
  }, [adventurer, cart.potions, selectedStats]);

  if (!updatedAdventurer) return null;

  const adventurerLvl = calculateLevel(updatedAdventurer.xp);

  const ambushResult = calculateAmbushRisk(updatedAdventurer);
  const obstacleResult = calculateObstacleRisk(updatedAdventurer);

  return (
    <Box sx={styles.eventsContainer}>
      <Typography variant="h6" sx={styles.title}>
        Exploration Risk Analysis
      </Typography>

      {/* AMBUSH */}
      <Box sx={styles.deathProbabilityBox}>
        <Typography variant="subtitle1" sx={styles.deathTitle}>
          Ambush Death Risk
        </Typography>
        <Box sx={styles.deathStats}>
          <Typography
            variant="h4"
            sx={{
              ...styles.deathPercentage,
              color:
                ambushResult.instantDeathProbability > 10
                  ? "#ff6b6b"
                  : ambushResult.instantDeathProbability > 5
                  ? "#ffd93d"
                  : "#4ecdc4",
            }}
          >
            {ambushResult.instantDeathProbability.toFixed(2)}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={Math.min(ambushResult.instantDeathProbability, 100)}
          sx={{
            ...styles.progressBar,
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                ambushResult.instantDeathProbability > 10
                  ? "#ff6b6b"
                  : ambushResult.instantDeathProbability > 5
                  ? "#ffd93d"
                  : "#4ecdc4",
            },
          }}
        />
        <Box sx={styles.avgDamageBox}>
          <Typography
            variant="subtitle1"
            sx={{ ...styles.deathTitle, color: "#e0e0e0", fontSize: "0.9rem" }}
          >
            Avg Non-Fatal Damage:
          </Typography>
          <Typography variant="subtitle1" sx={styles.avgDamage}>
            {ambushResult.avgNonFatalDamage} HP
          </Typography>
        </Box>
      </Box>

      {/* OBSTACLE */}
      <Box sx={styles.deathProbabilityBox}>
        <Typography variant="subtitle1" sx={styles.deathTitle}>
          Obstacle Death Risk
        </Typography>
        <Box sx={styles.deathStats}>
          <Typography
            variant="h4"
            sx={{
              ...styles.deathPercentage,
              color:
                obstacleResult.instantDeathProbability > 10
                  ? "#ff6b6b"
                  : obstacleResult.instantDeathProbability > 5
                  ? "#ffd93d"
                  : "#4ecdc4",
            }}
          >
            {obstacleResult.instantDeathProbability.toFixed(2)}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={Math.min(obstacleResult.instantDeathProbability, 100)}
          sx={{
            ...styles.progressBar,
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                obstacleResult.instantDeathProbability > 10
                  ? "#ff6b6b"
                  : obstacleResult.instantDeathProbability > 5
                  ? "#ffd93d"
                  : "#4ecdc4",
            },
          }}
        />
        <Box sx={styles.avgDamageBox}>
          <Typography
            variant="subtitle1"
            sx={{ ...styles.deathTitle, color: "#e0e0e0", fontSize: "0.9rem" }}
          >
            Avg Non-Fatal Damage:
          </Typography>
          <Typography variant="subtitle1" sx={styles.avgDamage}>
            {obstacleResult.avgNonFatalDamage} HP
          </Typography>
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
            <Box sx={styles.lootTiers}>
              <Typography variant="caption" sx={styles.lootTier}>
                T5: {(LOOT_PROBABILITY * 0.5).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T4: {(LOOT_PROBABILITY * 0.3).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T3: {(LOOT_PROBABILITY * 0.12).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T2: {(LOOT_PROBABILITY * 0.06).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T1: {(LOOT_PROBABILITY * 0.02).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const styles = {
  eventsContainer: {
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

    width: "380px",
    maxHeight: "85vh",
  },
  title: {
    color: "#4ecdc4",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  deathProbabilityBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    width: "90%",
    border: "2px solid #ff6b6b",
    borderRadius: "8px",
    padding: "12px",
    margin: "12px 12px 12px 12px",
    background: "rgba(255, 107, 107, 0.1)",
  },
  deathTitle: {
    color: "#ff6b6b",
    fontWeight: "bold",
    textAlign: "center",
  },
  deathStats: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  deathPercentage: {
    fontWeight: "bold",
    fontSize: "2.5rem",
  },
  avgDamageBox: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "6px",
  },
  avgDamage: {
    fontWeight: "600",
    fontSize: "1.1rem",
    color: "#ffb347",
  },
  progressBar: {
    width: "100%",
    height: "8px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
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
    margin: "12px 12px 12px 12px",
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
  lootTiers: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
  },
  lootTier: {
    color: "#ffb347",
    fontSize: "0.75rem",
  },
};
