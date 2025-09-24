import { PREFIXES_UNLOCK_GREATNESS } from "@/constants/loot";
import {
  BEAST_SPECIAL_NAME_LEVEL_UNLOCK,
  MAX_SPECIAL2,
  MAX_SPECIAL3,
} from "@/constants/beast";
import { Adventurer, Beast, Stats } from "@/types/game";
import {
  ability_based_percentage,
  calculateBeastDamage,
  calculateLevel,
} from "./game";
import { ItemUtils } from "./loot";

interface RiskAnalysisResult {
  instantDeathProbability: number;
  avgNonFatalDamage: number;
}

const BEAST_TYPES = ["Magic", "Hunter", "Brute"];
const BEAST_TIERS = [1, 2, 3, 4, 5];
const ARMOR_SLOTS = ["head", "chest", "waist", "hand", "foot"] as const;

const BEAST_TYPE_PROBABILITY = 1 / 3;
const BEAST_TIER_PROBABILITY = 1 / 5;
const ARMOR_SLOT_PROBABILITY = 1 / 5;
const BEAST_ENCOUNTER_PROBABILITY = 33 / 100;

const TOTAL_PREFIXES = Number(MAX_SPECIAL2);
const TOTAL_SUFFIXES = Number(MAX_SPECIAL3);

export const calculateAmbushRisk = (
  adventurer: Adventurer
): RiskAnalysisResult => {
  const adventurerLvl = calculateLevel(adventurer.xp);
  const critChance = adventurerLvl;
  const maxEncounterLvl =
    1 + (adventurerLvl * 3 - 1) + getBeastLevelDifficultyBonus(adventurerLvl);
  const ambushProbability =
    100 - ability_based_percentage(adventurer.xp, adventurer.stats.wisdom);

  const encounterResults = calculateEncounters(
    adventurer,
    maxEncounterLvl,
    critChance,
    "ambush"
  );

  return calculateFinalRiskResults(encounterResults, ambushProbability);
};

export const calculateObstacleRisk = (
  adventurer: Adventurer
): RiskAnalysisResult => {
  const adventurerLvl = calculateLevel(adventurer.xp);
  const critChance = adventurerLvl;
  const maxEncounterLvl =
    1 + (adventurerLvl * 3 - 1) + getBeastLevelDifficultyBonus(adventurerLvl);
  const obstacleProbability =
    100 -
    ability_based_percentage(adventurer.xp, adventurer.stats.intelligence);

  const encounterResults = calculateEncounters(
    adventurer,
    maxEncounterLvl,
    critChance,
    "obstacle"
  );

  return calculateFinalRiskResults(encounterResults, obstacleProbability);
};

function calculateEncounters(
  adventurer: Adventurer,
  maxEncounterLvl: number,
  critChance: number,
  type: "ambush" | "obstacle"
) {
  let totalDeathProbability = 0;
  let totalNonFatalDamage = 0;
  let totalNonFatalProbability = 0;

  for (let beastLvl = 1; beastLvl <= maxEncounterLvl; beastLvl++) {
    const lvlProbability = 1 / maxEncounterLvl;

    BEAST_TYPES.forEach((beastType) => {
      BEAST_TIERS.forEach((beastTier) => {
        ARMOR_SLOTS.forEach((armorSlot) => {
          const armor = adventurer.equipment[armorSlot];
          const scenarioProbability =
            lvlProbability *
            BEAST_TYPE_PROBABILITY *
            BEAST_TIER_PROBABILITY *
            ARMOR_SLOT_PROBABILITY;

          const beastCanHaveSpecials =
            beastLvl >= BEAST_SPECIAL_NAME_LEVEL_UNLOCK;
          const armorCanHaveSpecials =
            armor.id !== 0 &&
            calculateLevel(armor.xp) >= PREFIXES_UNLOCK_GREATNESS;

          if (
            beastCanHaveSpecials &&
            armorCanHaveSpecials &&
            type === "ambush"
          ) {
            const armorSpecials = ItemUtils.getSpecials(
              armor.id,
              calculateLevel(armor.xp),
              adventurer.item_specials_seed
            );
            const armorPrefix = armorSpecials.prefix;
            const armorSuffix = armorSpecials.suffix;

            const noMatchProb =
              ((TOTAL_PREFIXES - 1) * (TOTAL_SUFFIXES - 1)) /
              (TOTAL_PREFIXES * TOTAL_SUFFIXES);
            const prefixMatchProb =
              (TOTAL_SUFFIXES - 1) / (TOTAL_PREFIXES * TOTAL_SUFFIXES);
            const suffixMatchProb =
              (TOTAL_PREFIXES - 1) / (TOTAL_PREFIXES * TOTAL_SUFFIXES);
            const bothMatchProb = 1 / (TOTAL_PREFIXES * TOTAL_SUFFIXES);

            const scenarios = [
              { prefix: null, suffix: null, prob: noMatchProb },
              { prefix: armorPrefix, suffix: null, prob: prefixMatchProb },
              { prefix: null, suffix: armorSuffix, prob: suffixMatchProb },
              { prefix: armorPrefix, suffix: armorSuffix, prob: bothMatchProb },
            ];

            scenarios.forEach(({ prefix, suffix, prob }) => {
              const specialScenarioProbability = scenarioProbability * prob;

              const beast = createBeast(
                beastLvl,
                beastType,
                beastTier,
                prefix,
                suffix
              );

              const beastDamage = calculateBeastDamage(
                beast,
                adventurer,
                armor
              );

              const normalDamage = beastDamage.baseDamage;
              const criticalDamage = beastDamage.criticalDamage;

              const normalHitProbability = (100 - critChance) / 100;
              const normalScenarioProbability =
                specialScenarioProbability * normalHitProbability;

              if (normalDamage >= adventurer.health) {
                totalDeathProbability += normalScenarioProbability;
              } else {
                totalNonFatalDamage += normalScenarioProbability * normalDamage;
                totalNonFatalProbability += normalScenarioProbability;
              }

              const criticalHitProbability = critChance / 100;
              const criticalScenarioProbability =
                specialScenarioProbability * criticalHitProbability;

              if (criticalDamage >= adventurer.health) {
                totalDeathProbability += criticalScenarioProbability;
              } else {
                totalNonFatalDamage +=
                  criticalScenarioProbability * criticalDamage;
                totalNonFatalProbability += criticalScenarioProbability;
              }
            });
          } else {
            const beast = createBeast(
              beastLvl,
              beastType,
              beastTier,
              null,
              null
            );

            const beastDamage = calculateBeastDamage(beast, adventurer, armor);
            const normalDamage = beastDamage.baseDamage;
            const criticalDamage = beastDamage.criticalDamage;

            const normalHitProbability = (100 - critChance) / 100;
            const normalScenarioProbability =
              scenarioProbability * normalHitProbability;

            if (normalDamage >= adventurer.health) {
              totalDeathProbability += normalScenarioProbability;
            } else {
              totalNonFatalDamage += normalScenarioProbability * normalDamage;
              totalNonFatalProbability += normalScenarioProbability;
            }

            const criticalHitProbability = critChance / 100;
            const criticalScenarioProbability =
              scenarioProbability * criticalHitProbability;

            if (criticalDamage >= adventurer.health) {
              totalDeathProbability += criticalScenarioProbability;
            } else {
              totalNonFatalDamage +=
                criticalScenarioProbability * criticalDamage;
              totalNonFatalProbability += criticalScenarioProbability;
            }
          }
        });
      });
    });
  }

  return {
    totalDeathProbability,
    totalNonFatalDamage,
    totalNonFatalProbability,
  };
}

function calculateFinalRiskResults(
  encounterResults: {
    totalDeathProbability: number;
    totalNonFatalDamage: number;
    totalNonFatalProbability: number;
  },
  ambushProbability: number
): RiskAnalysisResult {
  const {
    totalDeathProbability,
    totalNonFatalDamage,
    totalNonFatalProbability,
  } = encounterResults;

  const avgNonFatalDamage =
    totalNonFatalProbability > 0
      ? totalNonFatalDamage / totalNonFatalProbability
      : 0;

  const instantDeathProbability =
    BEAST_ENCOUNTER_PROBABILITY *
    (ambushProbability / 100) *
    totalDeathProbability *
    100;

  return {
    instantDeathProbability,
    avgNonFatalDamage: Math.round(avgNonFatalDamage),
  };
}

export const addStats = (baseStats: Stats, additionalStats: Stats): Stats => {
  return {
    strength: baseStats.strength + additionalStats.strength,
    dexterity: baseStats.dexterity + additionalStats.dexterity,
    vitality: baseStats.vitality + additionalStats.vitality,
    intelligence: baseStats.intelligence + additionalStats.intelligence,
    wisdom: baseStats.wisdom + additionalStats.wisdom,
    charisma: baseStats.charisma + additionalStats.charisma,
    luck: baseStats.luck + additionalStats.luck,
  };
};

export const getBeastLevelDifficultyBonus = (
  adventurer_level: number
): number => {
  if (adventurer_level >= 50) {
    return 80;
  } else if (adventurer_level >= 40) {
    return 40;
  } else if (adventurer_level >= 30) {
    return 20;
  } else if (adventurer_level >= 20) {
    return 10;
  }
  return 0;
};

function createBeast(
  level: number,
  type: string,
  tier: number,
  specialPrefix: string | null,
  specialSuffix: string | null
): Beast {
  let beastId: number;
  switch (type) {
    case "Magic":
      beastId = 1; // Any ID 0-25 works, using 1
      break;
    case "Hunter":
      beastId = 26; // Any ID 26-50 works, using 26 (first Blade ID)
      break;
    case "Brute":
      beastId = 51; // Any ID 51-75 works, using 51 (first Bludgeon ID)
      break;
    default:
      beastId = 0;
  }

  return {
    id: beastId,
    seed: BigInt(0),
    baseName: "",
    name: "",
    health: 1,
    level,
    type,
    tier,
    specialPrefix,
    specialSuffix,
    isCollectable: false,
  };
}
