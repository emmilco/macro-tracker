import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = "https://dcnsjzyuxjkxtrwypucz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnNqenl1eGpreHRyd3lwdWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQ5MzEsImV4cCI6MjA3MTE4MDkzMX0.YdLNLJ2PRwIwz3VJaSTsDbXxTjh19qTVdUeepmQUrpE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility functions for database operations
export const dbUtils = {
  // Foods
  async getFoods() {
    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .order("frequency", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createFood(food: Omit<Food, "id" | "frequency">) {
    const { data, error } = await supabase
      .from("foods")
      .insert({ ...food, frequency: 0 })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateFood(id: string, updates: Partial<Food>) {
    const { data, error } = await supabase
      .from("foods")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFood(id: string) {
    const { error } = await supabase.from("foods").delete().eq("id", id);
    if (error) throw error;
  },

  async incrementFoodFrequency(id: string) {
    const { error } = await supabase.rpc("increment_food_frequency", {
      food_id: id,
    });
    if (error) throw error;
  },

  // Daily entries
  async getDailyEntry(date: string) {
    const { data, error } = await supabase
      .from("daily_entries")
      .select("*")
      .eq("date", date)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async createDailyEntry(date: string, dayType: "workout" | "rest") {
    const { data, error } = await supabase
      .from("daily_entries")
      .insert({ date, day_type: dayType })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDailyEntryType(id: string, dayType: "workout" | "rest") {
    const { data, error } = await supabase
      .from("daily_entries")
      .update({ day_type: dayType })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Food entries
  async getFoodEntries(dailyEntryId: string) {
    const { data, error } = await supabase
      .from("food_entries")
      .select("*")
      .eq("daily_entry_id", dailyEntryId);
    if (error) throw error;
    return data;
  },

  async createFoodEntry(foodEntry: Omit<FoodEntry, "id">) {
    const { data, error } = await supabase
      .from("food_entries")
      .insert(foodEntry)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateFoodEntryMultiplier(id: string, multiplier: number) {
    const { data, error } = await supabase
      .from("food_entries")
      .update({ multiplier })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFoodEntry(id: string) {
    const { error } = await supabase.from("food_entries").delete().eq("id", id);
    if (error) throw error;
  },

  // Settings
  async getSettings() {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async updateSettings(settings: Omit<UserSettings, "id">) {
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(settings)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

import type { Food, DailyEntry, FoodEntry, UserSettings } from "./types";
