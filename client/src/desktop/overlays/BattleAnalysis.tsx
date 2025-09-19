import { Box, Typography } from "@mui/material";
import { useGameStore } from "@/stores/gameStore";
import { calculateLevel } from "@/utils/game";
import { ItemId } from "@/constants/loot";
import { FleeSimulation } from "../components/FleeSimulation";

export default function BattleAnalysis() {
  const { adventurer, beast } = useGameStore();

  if (!adventurer || adventurer.xp === 0 || !beast) return null;

  const beastPower = beast.level * (6 - beast.tier);
  const goldReward =
    adventurer.equipment.ring.id === ItemId.GoldRing
      ? Math.floor(
          Math.floor(beastPower / 2) *
            0.03 *
            calculateLevel(adventurer.equipment.ring.xp)
        )
      : Math.floor(beastPower / 2);

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>Battle Analysis</Typography>

      <Box sx={styles.analysisContainer}>
        <FleeSimulation adventurer={adventurer} beast={beast} />
      </Box>
    </Box>
  );
}

const styles = {
  container: {
    backgroundColor: "rgba(26, 26, 26, 0.9)",
    border: "2px solid #444",
    borderRadius: "12px",
    padding: "32px",
    marginTop: "16px",
    backdropFilter: "blur(8px)",
    minHeight: "400px",
  },
  title: {
    color: "#fff",
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "24px",
    fontFamily: "VT323, monospace",
    textAlign: "center" as const,
  },
  analysisContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginBottom: "20px",
  },
};
