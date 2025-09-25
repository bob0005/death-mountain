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
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    itemAlign: "center",
    border: "2px solid #083e22",
    borderRadius: "8px",
    padding: "16px",
    background: "rgba(24, 40, 24, 0.95)",
    backdropFilter: "blur(8px)",
    width: "320px",
    maxWidth: "320px",
    overflow: "hidden",
  },
  title: {
    color: "#d0c98d",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  analysisContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
    padding: "0 12px",
  },
};
