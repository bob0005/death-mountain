import { Box, Typography } from "@mui/material";
import { useGameStore } from "@/stores/gameStore";
import { FleeSimulation } from "../components/FleeSimulation";
import { BattleSimulation } from "../components/BattleSimulation";

export default function BattleAnalysis() {
  const { adventurer, beast } = useGameStore();

  if (!adventurer || adventurer.xp === 0 || !beast) return null;

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>Battle Analysis</Typography>

      <Box sx={styles.analysisContainer}>
        <FleeSimulation adventurer={adventurer} beast={beast} />
        <BattleSimulation />
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
