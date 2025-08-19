export interface Food {
  id: string;
  name: string;
  portionSize: string;
  protein: number;
  carbs: number;
  fat: number;
  frequency: number;
  lastUsed: Date;
}

export interface FoodEntry {
  foodId: string;
  multiplier: number;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  dayType: "workout" | "rest";
  foods: FoodEntry[];
}

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserSettings {
  workoutTargets: MacroTargets;
  restTargets: MacroTargets;
}

export interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
}

export type DayType = "workout" | "rest";
