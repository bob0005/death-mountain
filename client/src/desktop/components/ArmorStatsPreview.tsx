import { ItemId } from "@/constants/loot";
import { useGameStore } from "@/stores/gameStore";
import { ItemUtils } from "@/utils/loot";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";

interface ArmorStatsPreviewProps {
  isOpen: boolean;
}

interface ArmorSetStats {
  cloth: { [slot: string]: string };
  hide: { [slot: string]: string };
  metal: { [slot: string]: string };
}

export default function ArmorStatsPreview({ isOpen }: ArmorStatsPreviewProps) {
  const { adventurer } = useGameStore();

  const armorStats = useMemo(() => {
    if (
      !adventurer?.item_specials_seed ||
      adventurer.item_specials_seed === 0
    ) {
      return null;
    }

    const stats: ArmorSetStats = {
      cloth: {},
      hide: {},
      metal: {},
    };

    const sampleArmor = {
      cloth: {
        Head: ItemId.Crown,
        Chest: ItemId.DivineRobe,
        Waist: ItemId.BrightsilkSash,
        Foot: ItemId.DivineSlippers,
        Hand: ItemId.DivineGloves,
      },
      hide: {
        Head: ItemId.DemonCrown,
        Chest: ItemId.DemonHusk,
        Waist: ItemId.DemonhideBelt,
        Foot: ItemId.DemonhideBoots,
        Hand: ItemId.DemonsHands,
      },
      metal: {
        Head: ItemId.AncientHelm,
        Chest: ItemId.HolyChestplate,
        Waist: ItemId.OrnateBelt,
        Foot: ItemId.HolyGreaves,
        Hand: ItemId.HolyGauntlets,
      },
    };

    Object.entries(sampleArmor).forEach(([armorType, slots]) => {
      Object.entries(slots).forEach(([slot, itemId]) => {
        const specials = ItemUtils.getSpecials(
          itemId,
          15,
          adventurer.item_specials_seed
        );
        if (specials.special1) {
          const statBonus = ItemUtils.getStatBonus(specials.special1);
          if (statBonus) {
            stats[armorType as keyof ArmorSetStats][slot] = statBonus;
          }
        }
      });
    });

    return stats;
  }, [adventurer?.item_specials_seed]);

  const armorTotals = useMemo(() => {
    if (!armorStats) return null;

    console.log(armorStats);

    const totals = {
      cloth: { STR: 0, DEX: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 },
      hide: { STR: 0, DEX: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 },
      metal: { STR: 0, DEX: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 },
    };

    Object.entries(armorStats).forEach(([armorType, slots]) => {
      Object.values(slots).forEach((statString) => {
        const statMatches = statString.match(
          /\+(\d+)\s+(STR|DEX|VIT|INT|WIS|CHA)/g
        );
        if (statMatches) {
          statMatches.forEach((match) => {
            const [, value, stat] = match.match(
              /\+(\d+)\s+(STR|DEX|VIT|INT|WIS|CHA)/
            )!;
            totals[armorType as keyof typeof totals][
              stat as keyof typeof totals.cloth
            ] += parseInt(value);
          });
        }
      });
    });

    return totals;
  }, [armorStats]);

  if (
    !isOpen ||
    !adventurer?.item_specials_seed ||
    adventurer.item_specials_seed === 0
  ) {
    return null;
  }

  if (!armorStats) {
    return null;
  }

  const formatTotal = (total: { [key: string]: number }) => {
    return Object.entries(total)
      .filter(([, value]) => value > 0)
      .map(([stat, value]) => `+${value} ${stat}`)
      .join(" ");
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.description}>
        <Typography sx={styles.descriptionText}>
          Level 15+ Armor Set Stats:
        </Typography>
      </Box>

      <Box sx={styles.armorGrid}>
        {(["cloth", "hide", "metal"] as const).map((armorType) => (
          <Box key={armorType} sx={styles.armorColumn}>
            <Box sx={styles.armorTypeHeader}>
              <Box
                component="img"
                src={`/images/types/${armorType}.svg`}
                alt={armorType}
                sx={styles.typeIcon}
              />
              <Typography sx={styles.armorTypeName}>
                {armorType.charAt(0).toUpperCase() + armorType.slice(1)}
              </Typography>
            </Box>

            <Box sx={styles.slotsContainer}>
              {Object.entries(armorStats[armorType]).map(([slot, stats]) => (
                <Box key={slot} sx={styles.slotRow}>
                  <Typography sx={styles.slotName}>{slot}:</Typography>
                  <Typography sx={styles.slotStats}>{stats}</Typography>
                </Box>
              ))}
            </Box>

            {armorTotals && (
              <Box sx={styles.totalRow}>
                <Typography sx={styles.totalStats}>
                  {formatTotal(armorTotals[armorType]) || "No bonuses"}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  description: {
    textAlign: "center",
    marginBottom: "6px",
  },
  descriptionText: {
    color: "#d0c98d",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  armorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  armorColumn: {
    background: "rgba(20, 20, 20, 0.6)",
    borderRadius: "4px",
    border: "1px solid rgba(215, 197, 41, 0.2)",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    minHeight: "140px",
  },
  armorTypeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginBottom: "8px",
    paddingBottom: "4px",
    borderBottom: "1px solid rgba(215, 197, 41, 0.2)",
  },
  typeIcon: {
    width: "16px",
    height: "16px",
    filter:
      "invert(0.85) sepia(0.3) saturate(1.5) hue-rotate(5deg) brightness(0.8)",
  },
  armorTypeName: {
    color: "#d7c529",
    fontSize: "0.8rem",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  slotsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
  },
  slotRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1px 0",
  },
  slotName: {
    color: "#d0c98d",
    fontSize: "0.7rem",
    minWidth: "38px",
    textAlign: "left",
    textTransform: "uppercase",
  },
  slotStats: {
    color: "#ffffff",
    fontSize: "0.7rem",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },
  totalRow: {
    marginTop: "auto",
    paddingTop: "6px",
    borderTop: "1px solid rgba(215, 197, 41, 0.3)",
    textAlign: "center",
  },
  totalStats: {
    color: "#d7c529",
    fontSize: "0.75rem",
    fontWeight: "bold",
    lineHeight: 1.2,
  },
};
