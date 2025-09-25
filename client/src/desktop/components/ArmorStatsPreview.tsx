import { ItemId } from "@/constants/loot";
import { useGameStore } from "@/stores/gameStore";
import { ItemUtils, slotIcons } from "@/utils/loot";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";

interface ArmorSetStats {
  cloth: { [slot: string]: string };
  hide: { [slot: string]: string };
  metal: { [slot: string]: string };
}

export default function ArmorStatsPreview({ isOpen }: { isOpen: boolean }) {
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

    const tier1Armor = {
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

    Object.entries(tier1Armor).forEach(([armorType, slots]) => {
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

    const totals = {
      cloth: { STR: 0, DEX: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 },
      hide: { STR: 0, DEX: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 },
      metal: { STR: 0, DEX: 0, VIT: 0, INT: 0, WIS: 0, CHA: 0 },
    };

    Object.entries(armorStats).forEach(([armorType, slots]) => {
      Object.values(slots).forEach((statString: string) => {
        const statMatches = statString.match(
          /\+(\d+)\s+(STR|DEX|VIT|INT|WIS|CHA)/g
        );
        if (statMatches) {
          statMatches.forEach((match: string) => {
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

  const formatStatBonus = (statString: string) => {
    const statMatches = statString.match(
      /\+(\d+)\s+(STR|DEX|VIT|INT|WIS|CHA)/g
    );
    if (!statMatches) return [];

    return statMatches.map((match) => {
      const [, value, stat] = match.match(
        /\+(\d+)\s+(STR|DEX|VIT|INT|WIS|CHA)/
      )!;
      return { value: parseInt(value), stat };
    });
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
              {Object.entries(armorStats[armorType]).map(([slot, stats]) => {
                const statBonuses = formatStatBonus(stats);

                return (
                  <Box key={slot} sx={styles.slotRow}>
                    <Box sx={styles.slotIconContainer}>
                      <Box
                        component="img"
                        src={slotIcons[slot as keyof typeof slotIcons]}
                        alt={slot}
                        sx={styles.slotIcon}
                      />
                    </Box>
                    <Box sx={styles.statsContainer}>
                      {statBonuses.map((bonus, index) => (
                        <Box key={index} sx={styles.statBonusItem}>
                          <Typography sx={styles.statValue}>
                            +{bonus.value}
                          </Typography>
                          <Typography sx={styles.statName}>
                            {bonus.stat}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {armorTotals && (
              <Box sx={styles.totalRow}>
                <Box sx={styles.totalStatsContainer}>
                  {Object.entries(armorTotals[armorType]).map(
                    ([stat, value]) => (
                      <Box key={stat} sx={styles.totalStatItem}>
                        <Typography sx={styles.totalStatValue}>
                          +{value}
                        </Typography>
                        <Typography sx={styles.totalStatName}>
                          {stat}
                        </Typography>
                      </Box>
                    )
                  )}
                </Box>
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
    gap: "6px",
  },
  armorColumn: {
    background: "rgba(20, 20, 20, 0.6)",
    borderRadius: "4px",
    border: "1px solid rgba(215, 197, 41, 0.2)",
    padding: "6px",
    display: "flex",
    flexDirection: "column",
    minHeight: "160px",
  },
  armorTypeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    marginBottom: "8px",
    paddingBottom: "4px",
    borderBottom: "1px solid rgba(215, 197, 41, 0.2)",
  },
  typeIcon: {
    width: "14px",
    height: "14px",
    filter:
      "invert(0.85) sepia(0.3) saturate(1.5) hue-rotate(5deg) brightness(0.8)",
  },
  armorTypeName: {
    color: "#d7c529",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  slotsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  slotRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "1px 0",
  },
  slotIconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "20px",
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
  slotIcon: {
    width: "14px",
    height: "14px",
    filter:
      "invert(0.85) sepia(0.3) saturate(1.5) hue-rotate(5deg) brightness(0.8)",
    opacity: 0.9,
  },
  statsContainer: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    alignItems: "flex-end",
    gap: "1px",
  },
  statBonusItem: {
    display: "grid",
    gridTemplateColumns: "18px 1fr",
    gap: "3px",
    alignItems: "baseline",
    width: "100%",
  },
  statValue: {
    color: "#ffffff",
    fontSize: "0.7rem",
    fontWeight: "500",
    lineHeight: 1.2,
    textAlign: "right",
  },
  statName: {
    color: "#ffffff",
    fontSize: "0.7rem",
    fontWeight: "500",
    lineHeight: 1.2,
  },
  totalRow: {
    marginTop: "4px",
    paddingTop: "8px",
    borderTop: "1px solid rgba(215, 197, 41, 0.3)",
  },
  totalStatsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "3px 6px",
  },
  totalStatItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    gap: "2px",
    justifyContent: "center",
  },
  totalStatValue: {
    color: "#d7c529",
    fontSize: "0.75rem",
    fontWeight: "bold",
    lineHeight: 1.2,
    minWidth: "20px",
    textAlign: "right",
  },
  totalStatName: {
    color: "#d7c529",
    fontSize: "0.75rem",
    fontWeight: "bold",
    lineHeight: 1.2,
  },
};
