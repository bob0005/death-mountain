import { Stats } from "@/types/game";
import { ability_based_percentage, calculateLevel } from "@/utils/game";
import { getBeastLevelDifficultyBonus } from "@/utils/beast";
import { Box, Typography, LinearProgress } from "@mui/material";
import { useGameStore } from "@/stores/gameStore";
import { useMemo } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { STARTING_HEALTH } from "@/constants/game";
import { calculateDeathProbabilityFromAmbush } from "@/utils/events";

export default function EventsOverlay() {
  const { adventurer, selectedStats } = useGameStore();
  const { cart } = useMarketStore();

  const tempAdventurer = useMemo(() => {
    if (!adventurer) return null;

    const vitalityHealthBonus = (selectedStats.vitality || 0) * 15;

    return {
      ...adventurer,
      health: Math.min(
        adventurer.health + vitalityHealthBonus + cart.potions * 10,
        STARTING_HEALTH +
          (selectedStats.vitality || 0 + adventurer.stats.vitality) * 15
      ),
      stats: {
        ...adventurer.stats,
        ...Object.entries(selectedStats).reduce((acc, [stat, value]) => {
          acc[stat as keyof Stats] = (adventurer.stats[stat as keyof Stats] +
            value) as Partial<Stats>[keyof Stats];
          return acc;
        }, {} as Partial<Stats>),
      },
    };
  }, [adventurer, selectedStats, cart.potions]);

  if (!tempAdventurer) return null;

  const adventurerLevel = calculateLevel(tempAdventurer.xp);
  const maxEncounterLevel =
    1 +
    (adventurerLevel * 3 - 1) +
    getBeastLevelDifficultyBonus(adventurerLevel);

  const evasionChance = ability_based_percentage(
    tempAdventurer.xp,
    tempAdventurer.stats.wisdom
  );
  const obstacleChance = ability_based_percentage(
    tempAdventurer.xp,
    tempAdventurer.stats.intelligence
  );
  const ambushChance = 100 - evasionChance;
  const obstacleAmbushChance = 100 - obstacleChance;

  const beastResult = calculateDeathProbabilityFromAmbush(
    tempAdventurer,
    adventurerLevel,
    maxEncounterLevel,
    ambushChance
  );

  const obstacleResult = calculateDeathProbabilityFromAmbush(
    tempAdventurer,
    adventurerLevel,
    maxEncounterLevel,
    obstacleAmbushChance
  );

  const discoveryChance = 33; // 33% chance of discovery encounter

  // Gold formula from contract: (rnd % adventurer_level) + 1
  // Range: 1 to adventurer_level, so average = (1 + adventurer_level) / 2
  const avgGoldDiscovery = ((1 + adventurerLevel) / 2).toFixed(1);

  // Health formula from contract: ((rnd % adventurer_level) + 1) * 2
  // Range: 2 to (adventurer_level * 2), so average = ((1 + adventurer_level) * 2) / 2 = (1 + adventurer_level)
  const avgHealthDiscovery = 1 + adventurerLevel;

  // Gold and Health probabilities within discovery events
  const goldChanceInDiscovery = 45;
  const healthChanceInDiscovery = 45;
  const lootChanceInDiscovery = 10;

  // Overall probabilities (33% discovery * chance within discovery)
  const overallGoldChance = (discoveryChance * goldChanceInDiscovery) / 100;
  const overallHealthChance = (discoveryChance * healthChanceInDiscovery) / 100;
  const overallLootChance = (discoveryChance * lootChanceInDiscovery) / 100;

  // D

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
                beastResult.totalDeathChance > 10
                  ? "#ff6b6b"
                  : beastResult.totalDeathChance > 5
                  ? "#ffd93d"
                  : "#4ecdc4",
            }}
          >
            {beastResult.totalDeathChance.toFixed(2)}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={Math.min(beastResult.totalDeathChance, 100)}
          sx={{
            ...styles.progressBar,
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                beastResult.totalDeathChance > 10
                  ? "#ff6b6b"
                  : beastResult.totalDeathChance > 5
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
            {beastResult.averageNonFatalDamage} HP
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
                obstacleResult.totalDeathChance > 10
                  ? "#ff6b6b"
                  : obstacleResult.totalDeathChance > 5
                  ? "#ffd93d"
                  : "#4ecdc4",
            }}
          >
            {obstacleResult.totalDeathChance.toFixed(2)}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={Math.min(obstacleResult.totalDeathChance, 100)}
          sx={{
            ...styles.progressBar,
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                obstacleResult.totalDeathChance > 10
                  ? "#ff6b6b"
                  : obstacleResult.totalDeathChance > 5
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
            {obstacleResult.averageNonFatalDamage} HP
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
              Gold ({overallGoldChance.toFixed(1)}%)
            </Typography>
            <Typography variant="subtitle1" sx={styles.discoveryValue}>
              ~{avgGoldDiscovery} gold
            </Typography>
          </Box>

          <Box sx={styles.discoveryItem}>
            <Typography variant="body2" sx={styles.discoveryLabel}>
              Health ({overallHealthChance.toFixed(1)}%)
            </Typography>
            <Typography variant="subtitle1" sx={styles.discoveryValue}>
              ~{avgHealthDiscovery} HP
            </Typography>
          </Box>

          <Box sx={styles.discoveryItem}>
            <Typography variant="body2" sx={styles.discoveryLabel}>
              Loot ({overallLootChance.toFixed(1)}%)
            </Typography>
            <Box sx={styles.lootTiers}>
              <Typography variant="caption" sx={styles.lootTier}>
                T5: {(overallLootChance * 0.5).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T4: {(overallLootChance * 0.3).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T3: {(overallLootChance * 0.12).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T2: {(overallLootChance * 0.06).toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={styles.lootTier}>
                T1: {(overallLootChance * 0.02).toFixed(1)}%
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
  eventBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    border: "1px solid #083e22",
    borderRadius: "8px",
    padding: "12px",
    background: "rgba(24, 40, 24, 0.8)",
    backdropFilter: "blur(4px)",
    minHeight: "80px",
  },
  eventTitle: {
    color: "#ffd93d",
    fontWeight: "bold",
    textAlign: "center",
  },
  eventSubtitle: {
    color: "#b8b8b8",
    textAlign: "center",
    fontSize: "0.85rem",
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
