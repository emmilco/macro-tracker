// src/types/index.ts

export interface Food {
  id: string;
  name: string;
  portion_size: string;
  protein: number;
  carbs: number;
  fat: number;
  frequency: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailyEntry {
  id: string;
  date: string;
  day_type: 'workout' | 'rest';
  created_at?: string;
}

export interface FoodEntry {
  id: string;
  daily_entry_id: string;
  food_id: string;
  multiplier: number;
  // Historical preservation fields
  food_name: string;
  food_portion_size: string;
  food_protein: number;
  food_carbs: number;
  food_fat: number;
  created_at?: string;
}

export interface UserSettings {
  id: string;
  workout_protein: number;
  workout_carbs: number;
  workout_fat: number;
  rest_protein: number;
  rest_carbs: number;
  rest_fat: number;
  created_at?: string;
  updated_at?: string;
}

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface FoodWithEntry extends Food {
  multiplier?: number;
  entryId?: string;
}

export type DayType = 'workout' | 'rest';
export type Tab = 'today' | 'history' | 'settings';

export interface AddFoodFormData {
  name: string;
  portion_size: string;
  protein: number;
  carbs: number;
  fat: number;
}