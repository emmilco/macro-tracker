export interface Food {
  id: string;
  name: string;
  portion_size: string;
  protein: number;
  carbs: number;
  fat: number;
  frequency: number;
}

export interface DailyEntry {
  id: string;
  date: string;
  day_type: "workout" | "rest";
}

export interface FoodEntry {
  id: string;
  daily_entry_id: string;
  food_id: string;
  multiplier: number;
  food_name: string;
  food_portion_size: string;
  food_protein: number;
  food_carbs: number;
  food_fat: number;
}

export interface UserSettings {
  id: string;
  workout_protein: number;
  workout_carbs: number;
  workout_fat: number;
  rest_protein: number;
  rest_carbs: number;
  rest_fat: number;
}

export interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}
