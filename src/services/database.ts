// src/services/database.ts

import { supabase } from "../supabase";
import type {
  Food,
  DailyEntry,
  FoodEntry,
  UserSettings,
  AddFoodFormData,
  DayType,
} from "../types";

// Food operations
export const getAllFoods = async (): Promise<Food[]> => {
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .order("frequency", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const addFood = async (foodData: AddFoodFormData): Promise<Food> => {
  const { data, error } = await supabase
    .from("foods")
    .insert({
      ...foodData,
      frequency: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateFood = async (
  id: string,
  foodData: Partial<AddFoodFormData>
): Promise<Food> => {
  const { data, error } = await supabase
    .from("foods")
    .update(foodData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFood = async (id: string): Promise<void> => {
  const { error } = await supabase.from("foods").delete().eq("id", id);

  if (error) throw error;
};

export const incrementFoodFrequency = async (id: string): Promise<void> => {
  const { error } = await supabase.rpc("increment_food_frequency", {
    food_id: id,
  });
  if (error) throw error;
};

// Daily entry operations
export const getTodayEntry = async (
  date: string
): Promise<DailyEntry | null> => {
  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("date", date)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

export const createDailyEntry = async (
  date: string,
  dayType: DayType
): Promise<DailyEntry> => {
  const { data, error } = await supabase
    .from("daily_entries")
    .insert({
      date,
      day_type: dayType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDailyEntryType = async (
  id: string,
  dayType: DayType
): Promise<DailyEntry> => {
  const { data, error } = await supabase
    .from("daily_entries")
    .update({ day_type: dayType })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Food entry operations
export const getFoodEntriesForDay = async (
  dailyEntryId: string
): Promise<FoodEntry[]> => {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("daily_entry_id", dailyEntryId)
    .order("created_at");

  if (error) throw error;
  return data || [];
};

export const addFoodToDay = async (
  dailyEntryId: string,
  food: Food,
  multiplier: number = 1
): Promise<FoodEntry> => {
  // First increment the food frequency
  await incrementFoodFrequency(food.id);

  // Then add the food entry with historical preservation
  const { data, error } = await supabase
    .from("food_entries")
    .insert({
      daily_entry_id: dailyEntryId,
      food_id: food.id,
      multiplier,
      // Historical preservation fields
      food_name: food.name,
      food_portion_size: food.portion_size,
      food_protein: food.protein,
      food_carbs: food.carbs,
      food_fat: food.fat,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateFoodEntryMultiplier = async (
  id: string,
  multiplier: number
): Promise<FoodEntry> => {
  const { data, error } = await supabase
    .from("food_entries")
    .update({ multiplier })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeFoodFromDay = async (id: string): Promise<void> => {
  const { error } = await supabase.from("food_entries").delete().eq("id", id);

  if (error) throw error;
};

// Settings operations
export const getUserSettings = async (): Promise<UserSettings | null> => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

export const updateUserSettings = async (
  settings: Partial<UserSettings>
): Promise<UserSettings> => {
  const existingSettings = await getUserSettings();

  if (existingSettings) {
    const { data, error } = await supabase
      .from("user_settings")
      .update(settings)
      .eq("id", existingSettings.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("user_settings")
      .insert(settings)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Utility functions
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const calculateCalories = (
  protein: number,
  carbs: number,
  fat: number
): number => {
  return protein * 4 + carbs * 4 + fat * 9;
};
