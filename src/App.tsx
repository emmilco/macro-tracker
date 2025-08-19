// src/App.tsx

import React, { useState, useEffect } from "react";
import { Header } from "./components/Header/Header";
import { Navigation } from "./components/Navigation/Navigation";
import { MacroProgress } from "./components/MacroProgress/MacroProgress";
import { FoodTile } from "./components/FoodTile/FoodTile";
import { AddFoodForm } from "./components/AddFoodForm/AddFoodForm";
import { History } from "./components/History/History";
import { initializeDatabase, seedDefaultData } from "./lib/supabase";
import {
  getAllFoods,
  getTodayEntry,
  createDailyEntry,
  updateDailyEntryType,
  getFoodEntriesForDay,
  addFoodToDay,
  removeFoodFromDay,
  updateFoodEntryMultiplier,
  getUserSettings,
  updateUserSettings,
  addFood,
  updateFood,
  deleteFood,
  formatDate,
  calculateCalories,
} from "./services/database";
import type {
  Food,
  DailyEntry,
  FoodEntry,
  UserSettings,
  DayType,
  Tab,
  MacroTargets,
  MacroTotals,
  AddFoodFormData,
} from "./types";
import "./styles/global.css";
import styles from "./App.module.css";

export const App: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [dayType, setDayType] = useState<DayType>("workout");
  const [foods, setFoods] = useState<Food[]>([]);
  const [dailyEntry, setDailyEntry] = useState<DailyEntry | null>(null);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFoodForm, setShowAddFoodForm] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);

  // Initialize the app
  useEffect(() => {
    const initApp = async () => {
      try {
        setLoading(true);

        // Initialize database and seed data
        const dbInitialized = await initializeDatabase();
        if (dbInitialized) {
          await seedDefaultData();
        }

        // Load initial data
        await Promise.all([loadFoods(), loadSettings(), loadTodayEntry()]);
      } catch (err) {
        console.error("Failed to initialize app:", err);
        setError("Failed to initialize application. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Load today's entry when day type changes
  useEffect(() => {
    if (dailyEntry) {
      updateDayType(dayType);
    }
  }, [dayType]);

  // Data loading functions
  const loadFoods = async () => {
    const foodsData = await getAllFoods();
    setFoods(foodsData);
  };

  const loadSettings = async () => {
    const settingsData = await getUserSettings();
    setSettings(settingsData);
  };

  const loadTodayEntry = async () => {
    const today = formatDate(new Date());
    let entry = await getTodayEntry(today);

    if (!entry) {
      entry = await createDailyEntry(today, dayType);
    } else {
      setDayType(entry.day_type);
    }

    setDailyEntry(entry);

    if (entry) {
      const entries = await getFoodEntriesForDay(entry.id);
      setFoodEntries(entries);
    }
  };

  // Event handlers
  const handleDayTypeChange = async (newDayType: DayType) => {
    setDayType(newDayType);
  };

  const updateDayType = async (newDayType: DayType) => {
    if (dailyEntry && dailyEntry.day_type !== newDayType) {
      try {
        const updatedEntry = await updateDailyEntryType(
          dailyEntry.id,
          newDayType
        );
        setDailyEntry(updatedEntry);
      } catch (err) {
        console.error("Failed to update day type:", err);
      }
    }
  };

  const handleAddFood = async (food: Food, multiplier: number = 1) => {
    if (!dailyEntry) return;

    try {
      const newEntry = await addFoodToDay(dailyEntry.id, food, multiplier);
      setFoodEntries((prev) => [...prev, newEntry]);

      // Update food frequency in local state
      setFoods((prev) =>
        prev
          .map((f) =>
            f.id === food.id ? { ...f, frequency: f.frequency + 1 } : f
          )
          .sort((a, b) => b.frequency - a.frequency)
      );
    } catch (err) {
      console.error("Failed to add food:", err);
      setError("Failed to add food to your day");
    }
  };

  const handleRemoveFood = async (entryId: string) => {
    try {
      await removeFoodFromDay(entryId);
      setFoodEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      console.error("Failed to remove food:", err);
      setError("Failed to remove food");
    }
  };

  const handleUpdateMultiplier = async (
    entryId: string,
    multiplier: number
  ) => {
    try {
      const updatedEntry = await updateFoodEntryMultiplier(entryId, multiplier);
      setFoodEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? updatedEntry : entry))
      );
    } catch (err) {
      console.error("Failed to update multiplier:", err);
      setError("Failed to update quantity");
    }
  };

  const handleCreateFood = async (foodData: AddFoodFormData) => {
    try {
      const newFood = await addFood(foodData);
      setFoods((prev) => [...prev, newFood]);
      setShowAddFoodForm(false);
    } catch (err) {
      console.error("Failed to create food:", err);
      setError("Failed to create food");
    }
  };

  const handleEditFood = (food: Food) => {
    setEditingFood(food);
  };

  const handleUpdateFood = async (foodData: AddFoodFormData) => {
    if (!editingFood) return;

    try {
      const updatedFood = await updateFood(editingFood.id, foodData);
      setFoods((prev) =>
        prev.map((f) => (f.id === editingFood.id ? updatedFood : f))
      );
      setEditingFood(null);
    } catch (err) {
      console.error("Failed to update food:", err);
      setError("Failed to update food");
    }
  };

  const handleDeleteFood = async (food: Food) => {
    if (!confirm(`Are you sure you want to delete "${food.name}"?`)) return;

    try {
      await deleteFood(food.id);
      setFoods((prev) => prev.filter((f) => f.id !== food.id));
    } catch (err) {
      console.error("Failed to delete food:", err);
      setError("Failed to delete food");
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updatedSettings = await updateUserSettings(newSettings);
      setSettings(updatedSettings);
    } catch (err) {
      console.error("Failed to update settings:", err);
      setError("Failed to update settings");
    }
  };

  // Calculate current macro totals
  const getCurrentTotals = (): MacroTotals => {
    const totals = foodEntries.reduce(
      (acc, entry) => ({
        protein: acc.protein + entry.food_protein * entry.multiplier,
        carbs: acc.carbs + entry.food_carbs * entry.multiplier,
        fat: acc.fat + entry.food_fat * entry.multiplier,
        calories: 0, // Will be calculated below
      }),
      { protein: 0, carbs: 0, fat: 0, calories: 0 }
    );

    totals.calories = calculateCalories(
      totals.protein,
      totals.carbs,
      totals.fat
    );
    return totals;
  };

  // Get current macro targets based on day type
  const getCurrentTargets = (): MacroTargets => {
    if (!settings) {
      return { protein: 180, carbs: 250, fat: 80 }; // Default workout targets
    }

    return dayType === "workout"
      ? {
          protein: settings.workout_protein,
          carbs: settings.workout_carbs,
          fat: settings.workout_fat,
        }
      : {
          protein: settings.rest_protein,
          carbs: settings.rest_carbs,
          fat: settings.rest_fat,
        };
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading MacroTracker...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  const currentTotals = getCurrentTotals();
  const currentTargets = getCurrentTargets();

  return (
    <div className={styles.app}>
      <Header dayType={dayType} onDayTypeChange={handleDayTypeChange} />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className={styles.main}>
        <div className={styles.container}>
          {activeTab === "today" && (
            <div className={styles.todayTab}>
              <MacroProgress targets={currentTargets} totals={currentTotals} />

              <div className={styles.foodSection}>
                <div className={styles.sectionHeader}>
                  <h2>Available Foods</h2>
                  <button
                    className={styles.addButton}
                    onClick={() => setShowAddFoodForm(true)}
                  >
                    + Add Food
                  </button>
                </div>

                <div className={styles.foodGrid}>
                  {foods.map((food) => (
                    <FoodTile
                      key={food.id}
                      food={food}
                      onAddFood={handleAddFood}
                      onEditFood={handleEditFood}
                      onDeleteFood={handleDeleteFood}
                    />
                  ))}
                </div>
              </div>

              {foodEntries.length > 0 && (
                <div className={styles.todayFoodsSection}>
                  <h2>Today's Foods</h2>
                  <div className={styles.todayFoodsList}>
                    {foodEntries.map((entry) => (
                      <div key={entry.id} className={styles.todayFoodItem}>
                        <div className={styles.foodInfo}>
                          <h3>{entry.food_name}</h3>
                          <p>{entry.food_portion_size}</p>
                          <div className={styles.macros}>
                            <span className={styles.protein}>
                              P:{" "}
                              {Math.round(
                                entry.food_protein * entry.multiplier
                              )}
                            </span>
                            <span className={styles.carbs}>
                              C:{" "}
                              {Math.round(entry.food_carbs * entry.multiplier)}
                            </span>
                            <span className={styles.fat}>
                              F: {Math.round(entry.food_fat * entry.multiplier)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.foodControls}>
                          <input
                            type="number"
                            value={entry.multiplier}
                            onChange={(e) =>
                              handleUpdateMultiplier(
                                entry.id,
                                parseFloat(e.target.value) || 1
                              )
                            }
                            min="0.1"
                            max="10"
                            step="0.1"
                            className={styles.multiplierInput}
                          />
                          <button
                            className={`${styles.removeButton} button-danger button-small`}
                            onClick={() => handleRemoveFood(entry.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && <History />}

          {activeTab === "settings" && (
            <div className={styles.settingsTab}>
              <h2>Settings</h2>
              {settings && (
                <div className={styles.settingsGrid}>
                  <div className={styles.settingsCard}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardIcon}>💪</span>
                      <h3>Workout Day Targets</h3>
                    </div>
                    <div className={styles.settingsInputs}>
                      <div className={styles.inputGroup}>
                        <label>Protein (g)</label>
                        <input
                          type="number"
                          value={settings.workout_protein}
                          onChange={(e) =>
                            handleUpdateSettings({
                              workout_protein: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Carbs (g)</label>
                        <input
                          type="number"
                          value={settings.workout_carbs}
                          onChange={(e) =>
                            handleUpdateSettings({
                              workout_carbs: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Fat (g)</label>
                        <input
                          type="number"
                          value={settings.workout_fat}
                          onChange={(e) =>
                            handleUpdateSettings({
                              workout_fat: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className={styles.calorieInfo}>
                        Total:{" "}
                        {calculateCalories(
                          settings.workout_protein,
                          settings.workout_carbs,
                          settings.workout_fat
                        )}{" "}
                        calories
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingsCard}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardIcon}>🧘</span>
                      <h3>Rest Day Targets</h3>
                    </div>
                    <div className={styles.settingsInputs}>
                      <div className={styles.inputGroup}>
                        <label>Protein (g)</label>
                        <input
                          type="number"
                          value={settings.rest_protein}
                          onChange={(e) =>
                            handleUpdateSettings({
                              rest_protein: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Carbs (g)</label>
                        <input
                          type="number"
                          value={settings.rest_carbs}
                          onChange={(e) =>
                            handleUpdateSettings({
                              rest_carbs: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Fat (g)</label>
                        <input
                          type="number"
                          value={settings.rest_fat}
                          onChange={(e) =>
                            handleUpdateSettings({
                              rest_fat: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className={styles.calorieInfo}>
                        Total:{" "}
                        {calculateCalories(
                          settings.rest_protein,
                          settings.rest_carbs,
                          settings.rest_fat
                        )}{" "}
                        calories
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add Food Form Modal */}
      {showAddFoodForm && (
        <AddFoodForm
          onSubmit={handleCreateFood}
          onCancel={() => setShowAddFoodForm(false)}
        />
      )}

      {/* Edit Food Form Modal */}
      {editingFood && (
        <AddFoodForm
          onSubmit={handleUpdateFood}
          onCancel={() => setEditingFood(null)}
          initialData={{
            name: editingFood.name,
            portion_size: editingFood.portion_size,
            protein: editingFood.protein,
            carbs: editingFood.carbs,
            fat: editingFood.fat,
          }}
          isEditing={true}
        />
      )}
    </div>
  );
};
