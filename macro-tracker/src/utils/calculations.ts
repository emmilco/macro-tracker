import type { Food, FoodEntry, MacroTotals } from "../types";

export const calculateMacros = (
  foods: FoodEntry[],
  foodDatabase: Food[]
): MacroTotals => {
  return foods.reduce(
    (totals, entry) => {
      const food = foodDatabase.find((f) => f.id === entry.foodId);
      if (!food) return totals;

      return {
        protein: totals.protein + food.protein * entry.multiplier,
        carbs: totals.carbs + food.carbs * entry.multiplier,
        fat: totals.fat + food.fat * entry.multiplier,
      };
    },
    { protein: 0, carbs: 0, fat: 0 }
  );
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const getTodayString = (): string => {
  return formatDate(new Date());
};

export const getCalories = (macros: MacroTotals): number => {
  return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
};

export const getMacroPercentage = (current: number, target: number): number => {
  return Math.round((current / target) * 100);
};
