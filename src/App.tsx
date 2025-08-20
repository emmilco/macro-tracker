import React, { useState, useEffect, useCallback } from "react";
import { dbUtils } from "./supabase";
import type {
  Food,
  DailyEntry,
  FoodEntry,
  UserSettings,
  MacroTotals,
  MacroTargets,
} from "./types";
import styles from "./App.module.css";

// Utility functions
const calculateMacros = (foodEntries: FoodEntry[]): MacroTotals => {
  const totals = foodEntries.reduce(
    (acc, entry) => ({
      protein: acc.protein + entry.food_protein * entry.multiplier,
      carbs: acc.carbs + entry.food_carbs * entry.multiplier,
      fat: acc.fat + entry.food_fat * entry.multiplier,
      calories:
        acc.calories +
        (entry.food_protein * 4 + entry.food_carbs * 4 + entry.food_fat * 9) *
          entry.multiplier,
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );

  return {
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    calories: Math.round(totals.calories),
  };
};

const getTargets = (
  settings: UserSettings | null,
  dayType: "workout" | "rest"
): MacroTargets => {
  if (!settings) {
    return dayType === "workout"
      ? { protein: 180, carbs: 250, fat: 80 }
      : { protein: 180, carbs: 150, fat: 100 };
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

const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Default foods to populate the database
const defaultFoods = [
  {
    name: "8oz Ground Beef (93/7)",
    portion_size: "8 oz serving",
    protein: 48,
    carbs: 0,
    fat: 16,
  },
  {
    name: "1 cup Jasmine Rice",
    portion_size: "1 cup cooked",
    protein: 8,
    carbs: 52,
    fat: 1,
  },
  {
    name: "1 Large Banana",
    portion_size: "1 large (126g)",
    protein: 1,
    carbs: 27,
    fat: 0,
  },
  {
    name: "2 Whole Eggs",
    portion_size: "2 large eggs",
    protein: 12,
    carbs: 1,
    fat: 10,
  },
  {
    name: "1 cup Broccoli",
    portion_size: "1 cup chopped",
    protein: 3,
    carbs: 6,
    fat: 0,
  },
  {
    name: "1 tbsp Olive Oil",
    portion_size: "1 tablespoon",
    protein: 0,
    carbs: 0,
    fat: 14,
  },
  {
    name: "Chicken Thigh",
    portion_size: "180g cooked",
    protein: 45,
    carbs: 0,
    fat: 14,
  },
  {
    name: "Chicken Breast",
    portion_size: "180g cooked",
    protein: 58,
    carbs: 0,
    fat: 6,
  },
  { name: "Shrimp", portion_size: "6oz", protein: 28, carbs: 0, fat: 0 },
  { name: "Tilapia", portion_size: "4oz", protein: 23, carbs: 0, fat: 2 },
];

// Components
interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
}

const MacroBar: React.FC<MacroBarProps> = ({
  label,
  current,
  target,
  color,
}) => {
  const percentage = Math.min((current / target) * 100, 100);
  const height = `${percentage}%`;

  return (
    <div className={styles.macroBar}>
      <div className={styles.macroBarChart}>
        <div className={styles.macroBarBackground} style={{ height: "100%" }} />
        <div
          className={`${styles.macroBarFill} ${styles[`${color}Bar`]}`}
          style={{ height }}
        />
      </div>
      <div className={styles.macroLabel}>{label}</div>
      <div className={styles.macroValues}>
        {current}g / {target}g
      </div>
    </div>
  );
};

interface FoodTileProps {
  food: Food;
  onAddFood: (food: Food) => void;
  onEditFood: (food: Food) => void;
  onDeleteFood: (food: Food) => void;
}

const FoodTile: React.FC<FoodTileProps> = ({
  food,
  onAddFood,
  onEditFood,
  onDeleteFood,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={styles.foodTile} onClick={() => onAddFood(food)}>
      <div className={styles.foodTileHeader}>
        <h3 className={styles.foodName}>{food.name}</h3>
        <div className={styles.foodTileRight}>
          {food.frequency > 0 && (
            <div className={styles.frequency}>{food.frequency}×</div>
          )}
          <div className={styles.foodActions}>
            <button
              className={styles.foodMenu}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              ⋯
            </button>
            {showMenu && (
              <div className={styles.foodMenuDropdown}>
                <button
                  className={styles.foodMenuOption}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditFood(food);
                    setShowMenu(false);
                  }}
                >
                  Edit
                </button>
                <button
                  className={`${styles.foodMenuOption} ${styles.delete}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFood(food);
                    setShowMenu(false);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.foodInfo}>
        <div className={styles.portionSize}>{food.portion_size}</div>
        <div className={styles.macroInfo}>
          <span className={styles.macroValue}>P:{food.protein}</span>
          <span className={styles.macroValue}>C:{food.carbs}</span>
          <span className={styles.macroValue}>F:{food.fat}</span>
        </div>
      </div>
    </div>
  );
};

interface EditFoodModalProps {
  food: Food | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (food: Food) => void;
}

const EditFoodModal: React.FC<EditFoodModalProps> = ({
  food,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    portion_size: "",
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  useEffect(() => {
    if (food) {
      setFormData({
        name: food.name,
        portion_size: food.portion_size,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      });
    }
  }, [food]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (food) {
      onSave({ ...food, ...formData });
    }
  };

  if (!isOpen || !food) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Food</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalFormGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Name</label>
            <input
              type="text"
              className={styles.formInput}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Portion Size</label>
            <input
              type="text"
              className={styles.formInput}
              value={formData.portion_size}
              onChange={(e) =>
                setFormData({ ...formData, portion_size: e.target.value })
              }
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Protein (g)</label>
            <input
              type="number"
              className={styles.formInput}
              value={formData.protein}
              onChange={(e) =>
                setFormData({ ...formData, protein: Number(e.target.value) })
              }
              min="0"
              step="0.1"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Carbs (g)</label>
            <input
              type="number"
              className={styles.formInput}
              value={formData.carbs}
              onChange={(e) =>
                setFormData({ ...formData, carbs: Number(e.target.value) })
              }
              min="0"
              step="0.1"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Fat (g)</label>
            <input
              type="number"
              className={styles.formInput}
              value={formData.fat}
              onChange={(e) =>
                setFormData({ ...formData, fat: Number(e.target.value) })
              }
              min="0"
              step="0.1"
              required
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  // State
  const [currentTab, setCurrentTab] = useState<
    "today" | "history" | "meal-builder" | "settings"
  >("today");
  const [dayType, setDayType] = useState<"workout" | "rest">("workout");
  const [foods, setFoods] = useState<Food[]>([]);
  const [dailyEntry, setDailyEntry] = useState<DailyEntry | null>(null);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newFoodForm, setNewFoodForm] = useState({
    name: "",
    portion_size: "",
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  // Meal Builder state
  const [mealForm, setMealForm] = useState({
    name: "",
    portions: 1,
  });
  const [mealFoods, setMealFoods] = useState<(Food & { quantity: number })[]>(
    []
  );
  const [mealSearchTerm, setMealSearchTerm] = useState("");

  const today = formatDate(new Date());
  const currentMacros = calculateMacros(foodEntries);
  const targets = getTargets(settings, dailyEntry?.day_type || dayType);

  // Filter foods based on search term
  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter foods for meal builder
  const filteredMealFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(mealSearchTerm.toLowerCase())
  );

  // Calculate meal totals
  const mealTotals = mealFoods.reduce(
    (totals, food) => ({
      protein: totals.protein + food.protein * food.quantity,
      carbs: totals.carbs + food.carbs * food.quantity,
      fat: totals.fat + food.fat * food.quantity,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load foods
        const foodsData = await dbUtils.getFoods();
        if (foodsData.length === 0) {
          // Populate with default foods if empty
          for (const food of defaultFoods) {
            await dbUtils.createFood(food);
          }
          const newFoodsData = await dbUtils.getFoods();
          setFoods(newFoodsData);
        } else {
          setFoods(foodsData);
        }

        // Load settings
        const settingsData = await dbUtils.getSettings();
        if (!settingsData) {
          // Create default settings
          const defaultSettings = {
            workout_protein: 180,
            workout_carbs: 250,
            workout_fat: 80,
            rest_protein: 180,
            rest_carbs: 150,
            rest_fat: 100,
          };
          await dbUtils.updateSettings(defaultSettings);
          setSettings({ id: "1", ...defaultSettings });
        } else {
          setSettings(settingsData);
        }

        // Load today's entry
        const todayEntry = await dbUtils.getDailyEntry(today);
        if (todayEntry) {
          setDailyEntry(todayEntry);
          setDayType(todayEntry.day_type);
          const entries = await dbUtils.getFoodEntries(todayEntry.id);
          setFoodEntries(entries);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [today]);

  // Handle day type change
  const handleDayTypeChange = async (newDayType: "workout" | "rest") => {
    setDayType(newDayType);

    if (dailyEntry) {
      try {
        const updatedEntry = await dbUtils.updateDailyEntryType(
          dailyEntry.id,
          newDayType
        );
        setDailyEntry(updatedEntry);
      } catch (error) {
        console.error("Error updating day type:", error);
      }
    }
  };

  // Add food to today's meals
  const handleAddFood = async (food: Food) => {
    try {
      let entry = dailyEntry;

      // Create daily entry if it doesn't exist
      if (!entry) {
        entry = await dbUtils.createDailyEntry(today, dayType);
        setDailyEntry(entry);
      }

      // At this point entry is guaranteed to be non-null
      if (!entry) {
        throw new Error("Failed to create or retrieve daily entry");
      }

      // Create food entry with snapshot of food data
      const foodEntry = await dbUtils.createFoodEntry({
        daily_entry_id: entry.id,
        food_id: food.id,
        multiplier: 1,
        food_name: food.name,
        food_portion_size: food.portion_size,
        food_protein: food.protein,
        food_carbs: food.carbs,
        food_fat: food.fat,
      });

      setFoodEntries([...foodEntries, foodEntry]);

      // Increment food frequency
      await dbUtils.incrementFoodFrequency(food.id);
      const updatedFoods = await dbUtils.getFoods();
      setFoods(updatedFoods);
    } catch (error) {
      console.error("Error adding food:", error);
    }
  };

  // Update food entry multiplier
  const handleUpdateMultiplier = async (
    entryId: string,
    newMultiplier: number
  ) => {
    if (newMultiplier < 0.25) return;

    try {
      await dbUtils.updateFoodEntryMultiplier(entryId, newMultiplier);
      setFoodEntries(
        foodEntries.map((entry) =>
          entry.id === entryId ? { ...entry, multiplier: newMultiplier } : entry
        )
      );
    } catch (error) {
      console.error("Error updating multiplier:", error);
    }
  };

  // Remove food entry
  const handleRemoveFoodEntry = async (entryId: string) => {
    try {
      await dbUtils.deleteFoodEntry(entryId);
      setFoodEntries(foodEntries.filter((entry) => entry.id !== entryId));
    } catch (error) {
      console.error("Error removing food entry:", error);
    }
  };

  // Add new food
  const handleAddNewFood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newFood = await dbUtils.createFood(newFoodForm);
      setFoods([...foods, newFood]);

      // Clear form
      setNewFoodForm({
        name: "",
        portion_size: "",
        protein: 0,
        carbs: 0,
        fat: 0,
      });

      // Close the modal
      setShowAddFoodModal(false);

      // Automatically add the new food to today's meals
      await handleAddFood(newFood);
    } catch (error) {
      console.error("Error adding new food:", error);
    }
  };

  // Edit food
  const handleEditFood = (food: Food) => {
    setEditingFood(food);
    setShowEditModal(true);
  };

  // Save edited food
  const handleSaveEditedFood = async (updatedFood: Food) => {
    try {
      await dbUtils.updateFood(updatedFood.id, updatedFood);
      setFoods(
        foods.map((food) => (food.id === updatedFood.id ? updatedFood : food))
      );

      setShowEditModal(false);
      setEditingFood(null);
    } catch (error) {
      console.error("Error updating food:", error);
    }
  };

  // Delete food
  const handleDeleteFood = async (food: Food) => {
    if (confirm(`Are you sure you want to delete "${food.name}"?`)) {
      try {
        await dbUtils.deleteFood(food.id);
        setFoods(foods.filter((f) => f.id !== food.id));
      } catch (error) {
        console.error("Error deleting food:", error);
      }
    }
  };

  // Update settings
  const handleUpdateSettings = async (
    newSettings: Omit<UserSettings, "id">
  ) => {
    try {
      const updated = await dbUtils.updateSettings(newSettings);
      setSettings(updated);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  // Meal Builder functions
  const handleAddFoodToMeal = (food: Food) => {
    const existingFood = mealFoods.find((f) => f.id === food.id);
    if (existingFood) {
      setMealFoods(
        mealFoods.map((f) =>
          f.id === food.id ? { ...f, quantity: f.quantity + 1 } : f
        )
      );
    } else {
      setMealFoods([...mealFoods, { ...food, quantity: 1 }]);
    }
  };

  const handleRemoveFoodFromMeal = (foodId: string) => {
    setMealFoods(mealFoods.filter((f) => f.id !== foodId));
  };

  const handleUpdateMealFoodQuantity = (foodId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFoodFromMeal(foodId);
    } else {
      setMealFoods(
        mealFoods.map((f) => (f.id === foodId ? { ...f, quantity } : f))
      );
    }
  };

  const handleCreateMeal = async () => {
    if (!mealForm.name || mealFoods.length === 0 || mealForm.portions <= 0) {
      alert(
        "Please provide a meal name, add at least one food, and set a valid number of portions."
      );
      return;
    }

    try {
      const newMeal = {
        name: mealForm.name,
        portion_size: "1 portion",
        protein: Math.round((mealTotals.protein / mealForm.portions) * 10) / 10,
        carbs: Math.round((mealTotals.carbs / mealForm.portions) * 10) / 10,
        fat: Math.round((mealTotals.fat / mealForm.portions) * 10) / 10,
      };

      const createdFood = await dbUtils.createFood(newMeal);
      setFoods([...foods, createdFood]);

      // Reset form
      setMealForm({ name: "", portions: 1 });
      setMealFoods([]);
      setMealSearchTerm("");

      alert(`Meal "${newMeal.name}" created successfully!`);
    } catch (error) {
      console.error("Error creating meal:", error);
      alert("Error creating meal. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Macro Tracker</h1>
          <div className={styles.headerRight}>
            <div className={styles.dayTypeToggle}>
              <button
                className={`${styles.dayTypeButton} ${
                  dayType === "workout" ? styles.active : ""
                }`}
                onClick={() => handleDayTypeChange("workout")}
              >
                💪 Workout
              </button>
              <button
                className={`${styles.dayTypeButton} ${
                  dayType === "rest" ? styles.active : ""
                }`}
                onClick={() => handleDayTypeChange("rest")}
              >
                🧘 Rest
              </button>
            </div>
            <button
              className={styles.addFoodButton}
              onClick={() => setShowAddFoodModal(true)}
            >
              <span>+</span>
              Add Food
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navTabs}>
          <button
            className={`${styles.navTab} ${
              currentTab === "today" ? styles.active : ""
            }`}
            onClick={() => setCurrentTab("today")}
          >
            Today
          </button>
          <button
            className={`${styles.navTab} ${
              currentTab === "history" ? styles.active : ""
            }`}
            onClick={() => setCurrentTab("history")}
          >
            History
          </button>
          <button
            className={`${styles.navTab} ${
              currentTab === "meal-builder" ? styles.active : ""
            }`}
            onClick={() => setCurrentTab("meal-builder")}
          >
            Meal Builder
          </button>
          <button
            className={`${styles.navTab} ${
              currentTab === "settings" ? styles.active : ""
            }`}
            onClick={() => setCurrentTab("settings")}
          >
            Settings
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        {currentTab === "today" && (
          <>
            {/* Macro Progress */}
            <div className={styles.macroProgress}>
              <MacroBar
                label="Protein"
                current={currentMacros.protein}
                target={targets.protein}
                color="protein"
              />
              <MacroBar
                label="Carbs"
                current={currentMacros.carbs}
                target={targets.carbs}
                color="carbs"
              />
              <MacroBar
                label="Fat"
                current={currentMacros.fat}
                target={targets.fat}
                color="fat"
              />
              <div className={styles.caloriesDisplay}>
                <div className={styles.caloriesValue}>
                  {currentMacros.calories}
                </div>
                <div className={styles.caloriesLabel}>Total Calories</div>
              </div>
            </div>

            {/* Today's Foods */}
            {foodEntries.length > 0 && (
              <div className={styles.todaysFoods}>
                <h2 className={styles.sectionTitle}>Today's Foods</h2>
                {foodEntries.map((entry) => (
                  <div key={entry.id} className={styles.todayFood}>
                    <div className={styles.todayFoodInfo}>
                      <div className={styles.todayFoodName}>
                        {entry.food_name} × {entry.multiplier}
                      </div>
                      <div className={styles.todayFoodMacros}>
                        P: {Math.round(entry.food_protein * entry.multiplier)}g,
                        C: {Math.round(entry.food_carbs * entry.multiplier)}g,
                        F: {Math.round(entry.food_fat * entry.multiplier)}g
                      </div>
                    </div>
                    <div className={styles.todayFoodControls}>
                      <div className={styles.multiplierControls}>
                        <button
                          className={styles.multiplierButton}
                          onClick={() =>
                            handleUpdateMultiplier(
                              entry.id,
                              entry.multiplier - 0.25
                            )
                          }
                        >
                          −
                        </button>
                        <span className={styles.multiplierValue}>
                          {entry.multiplier}
                        </span>
                        <button
                          className={styles.multiplierButton}
                          onClick={() =>
                            handleUpdateMultiplier(
                              entry.id,
                              entry.multiplier + 0.25
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveFoodEntry(entry.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Food Database */}
            <div className={styles.foodSection}>
              <h2 className={styles.sectionTitle}>Food Database</h2>

              {/* Search Bar */}
              <div className={styles.searchContainer}>
                <div className={styles.searchInputWrapper}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search foods..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className={styles.clearSearch}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <div className={styles.searchResults}>
                    {filteredFoods.length} food
                    {filteredFoods.length !== 1 ? "s" : ""} found
                  </div>
                )}
              </div>

              <div className={styles.foodGrid}>
                {filteredFoods.length > 0 ? (
                  filteredFoods.map((food) => (
                    <FoodTile
                      key={food.id}
                      food={food}
                      onAddFood={handleAddFood}
                      onEditFood={handleEditFood}
                      onDeleteFood={handleDeleteFood}
                    />
                  ))
                ) : searchTerm ? (
                  <div className={styles.noResults}>
                    <p>No foods found matching "{searchTerm}"</p>
                    <p className={styles.noResultsHint}>
                      Try a different search term or add a new food using the
                      button in the header.
                    </p>
                  </div>
                ) : (
                  foods.map((food) => (
                    <FoodTile
                      key={food.id}
                      food={food}
                      onAddFood={handleAddFood}
                      onEditFood={handleEditFood}
                      onDeleteFood={handleDeleteFood}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {currentTab === "meal-builder" && (
          <>
            {/* Meal Builder Header */}
            <div className={styles.mealBuilderContainer}>
              <h2 className={styles.sectionTitle}>Build a New Meal</h2>

              {/* Meal Form */}
              <div className={styles.mealForm}>
                <div className={styles.mealFormRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Meal Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={mealForm.name}
                      onChange={(e) =>
                        setMealForm({ ...mealForm, name: e.target.value })
                      }
                      placeholder="e.g., Protein Smoothie"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Number of Portions
                    </label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={mealForm.portions}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          portions: Math.max(1, Number(e.target.value)),
                        })
                      }
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Current Meal Foods */}
              {mealFoods.length > 0 && (
                <div className={styles.currentMeal}>
                  <h3 className={styles.sectionTitle}>
                    Current Meal ({mealFoods.length} food
                    {mealFoods.length !== 1 ? "s" : ""})
                  </h3>
                  {mealFoods.map((food) => (
                    <div key={food.id} className={styles.mealFood}>
                      <div className={styles.mealFoodInfo}>
                        <div className={styles.mealFoodName}>{food.name}</div>
                        <div className={styles.mealFoodMacros}>
                          P: {Math.round(food.protein * food.quantity)}g, C:{" "}
                          {Math.round(food.carbs * food.quantity)}g, F:{" "}
                          {Math.round(food.fat * food.quantity)}g
                        </div>
                      </div>
                      <div className={styles.mealFoodControls}>
                        <div className={styles.multiplierControls}>
                          <button
                            className={styles.multiplierButton}
                            onClick={() =>
                              handleUpdateMealFoodQuantity(
                                food.id,
                                food.quantity - 1
                              )
                            }
                          >
                            −
                          </button>
                          <span className={styles.multiplierValue}>
                            {food.quantity}
                          </span>
                          <button
                            className={styles.multiplierButton}
                            onClick={() =>
                              handleUpdateMealFoodQuantity(
                                food.id,
                                food.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveFoodFromMeal(food.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Meal Totals */}
                  <div className={styles.mealTotals}>
                    <div className={styles.mealTotalsTitle}>
                      Total per portion ({mealForm.portions} portion
                      {mealForm.portions !== 1 ? "s" : ""}):
                    </div>
                    <div className={styles.mealTotalsMacros}>
                      <span>
                        P:{" "}
                        {Math.round(
                          (mealTotals.protein / mealForm.portions) * 10
                        ) / 10}
                        g
                      </span>
                      <span>
                        C:{" "}
                        {Math.round(
                          (mealTotals.carbs / mealForm.portions) * 10
                        ) / 10}
                        g
                      </span>
                      <span>
                        F:{" "}
                        {Math.round((mealTotals.fat / mealForm.portions) * 10) /
                          10}
                        g
                      </span>
                      <span>
                        Cal:{" "}
                        {Math.round(
                          ((mealTotals.protein * 4 +
                            mealTotals.carbs * 4 +
                            mealTotals.fat * 9) /
                            mealForm.portions) *
                            10
                        ) / 10}
                      </span>
                    </div>
                  </div>

                  {/* Create Meal Button */}
                  <button
                    className={styles.createMealButton}
                    onClick={handleCreateMeal}
                    disabled={!mealForm.name || mealFoods.length === 0}
                  >
                    Create Meal
                  </button>
                </div>
              )}

              {/* Add Foods to Meal */}
              <div className={styles.foodSection}>
                <h3 className={styles.sectionTitle}>Add Foods to Meal</h3>

                {/* Meal Search */}
                <div className={styles.searchContainer}>
                  <div className={styles.searchInputWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search foods to add..."
                      value={mealSearchTerm}
                      onChange={(e) => setMealSearchTerm(e.target.value)}
                      className={styles.searchInput}
                    />
                    {mealSearchTerm && (
                      <button
                        onClick={() => setMealSearchTerm("")}
                        className={styles.clearSearch}
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {mealSearchTerm && (
                    <div className={styles.searchResults}>
                      {filteredMealFoods.length} food
                      {filteredMealFoods.length !== 1 ? "s" : ""} found
                    </div>
                  )}
                </div>

                <div className={styles.foodGrid}>
                  {filteredMealFoods.length > 0 ? (
                    filteredMealFoods.map((food) => (
                      <div
                        key={food.id}
                        className={styles.mealFoodTile}
                        onClick={() => handleAddFoodToMeal(food)}
                      >
                        <div className={styles.foodTileHeader}>
                          <h3 className={styles.foodName}>{food.name}</h3>
                          <div className={styles.foodTileRight}>
                            {food.frequency > 0 && (
                              <div className={styles.frequency}>
                                {food.frequency}×
                              </div>
                            )}
                            <span className={styles.addIcon}>+</span>
                          </div>
                        </div>
                        <div className={styles.foodInfo}>
                          <div className={styles.portionSize}>
                            {food.portion_size}
                          </div>
                          <div className={styles.macroInfo}>
                            <span className={styles.macroValue}>
                              P:{food.protein}
                            </span>
                            <span className={styles.macroValue}>
                              C:{food.carbs}
                            </span>
                            <span className={styles.macroValue}>
                              F:{food.fat}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : mealSearchTerm ? (
                    <div className={styles.noResults}>
                      <p>No foods found matching "{mealSearchTerm}"</p>
                    </div>
                  ) : (
                    foods.map((food) => (
                      <div
                        key={food.id}
                        className={styles.mealFoodTile}
                        onClick={() => handleAddFoodToMeal(food)}
                      >
                        <div className={styles.foodTileHeader}>
                          <h3 className={styles.foodName}>{food.name}</h3>
                          <div className={styles.foodTileRight}>
                            {food.frequency > 0 && (
                              <div className={styles.frequency}>
                                {food.frequency}×
                              </div>
                            )}
                            <span className={styles.addIcon}>+</span>
                          </div>
                        </div>
                        <div className={styles.foodInfo}>
                          <div className={styles.portionSize}>
                            {food.portion_size}
                          </div>
                          <div className={styles.macroInfo}>
                            <span className={styles.macroValue}>
                              P:{food.protein}
                            </span>
                            <span className={styles.macroValue}>
                              C:{food.carbs}
                            </span>
                            <span className={styles.macroValue}>
                              F:{food.fat}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {currentTab === "settings" && settings && (
          <div className={styles.settingsGrid}>
            {/* Workout Day Settings */}
            <div className={styles.settingsCard}>
              <div className={styles.settingsCardHeader}>
                <div className={styles.settingsIcon}>💪</div>
                <h3 className={styles.settingsCardTitle}>
                  Workout Day Targets
                </h3>
              </div>
              <div className={styles.settingsForm}>
                <div className={styles.macroInputGroup}>
                  <div className={styles.macroInputRow}>
                    <label className={styles.macroInputLabel}>Protein:</label>
                    <input
                      type="number"
                      className={styles.macroInput}
                      value={settings.workout_protein}
                      onChange={(e) =>
                        handleUpdateSettings({
                          ...settings,
                          workout_protein: Number(e.target.value),
                        })
                      }
                      min="0"
                    />
                    <span className={styles.macroUnit}>g</span>
                  </div>
                  <div className={styles.macroInputRow}>
                    <label className={styles.macroInputLabel}>Carbs:</label>
                    <input
                      type="number"
                      className={styles.macroInput}
                      value={settings.workout_carbs}
                      onChange={(e) =>
                        handleUpdateSettings({
                          ...settings,
                          workout_carbs: Number(e.target.value),
                        })
                      }
                      min="0"
                    />
                    <span className={styles.macroUnit}>g</span>
                  </div>
                  <div className={styles.macroInputRow}>
                    <label className={styles.macroInputLabel}>Fat:</label>
                    <input
                      type="number"
                      className={styles.macroInput}
                      value={settings.workout_fat}
                      onChange={(e) =>
                        handleUpdateSettings({
                          ...settings,
                          workout_fat: Number(e.target.value),
                        })
                      }
                      min="0"
                    />
                    <span className={styles.macroUnit}>g</span>
                  </div>
                </div>
                <div className={styles.calorieInfo}>
                  Total Calories:{" "}
                  {Math.round(
                    settings.workout_protein * 4 +
                      settings.workout_carbs * 4 +
                      settings.workout_fat * 9
                  )}
                </div>
              </div>
            </div>

            {/* Rest Day Settings */}
            <div className={styles.settingsCard}>
              <div className={styles.settingsCardHeader}>
                <div className={styles.settingsIcon}>🧘</div>
                <h3 className={styles.settingsCardTitle}>Rest Day Targets</h3>
              </div>
              <div className={styles.settingsForm}>
                <div className={styles.macroInputGroup}>
                  <div className={styles.macroInputRow}>
                    <label className={styles.macroInputLabel}>Protein:</label>
                    <input
                      type="number"
                      className={styles.macroInput}
                      value={settings.rest_protein}
                      onChange={(e) =>
                        handleUpdateSettings({
                          ...settings,
                          rest_protein: Number(e.target.value),
                        })
                      }
                      min="0"
                    />
                    <span className={styles.macroUnit}>g</span>
                  </div>
                  <div className={styles.macroInputRow}>
                    <label className={styles.macroInputLabel}>Carbs:</label>
                    <input
                      type="number"
                      className={styles.macroInput}
                      value={settings.rest_carbs}
                      onChange={(e) =>
                        handleUpdateSettings({
                          ...settings,
                          rest_carbs: Number(e.target.value),
                        })
                      }
                      min="0"
                    />
                    <span className={styles.macroUnit}>g</span>
                  </div>
                  <div className={styles.macroInputRow}>
                    <label className={styles.macroInputLabel}>Fat:</label>
                    <input
                      type="number"
                      className={styles.macroInput}
                      value={settings.rest_fat}
                      onChange={(e) =>
                        handleUpdateSettings({
                          ...settings,
                          rest_fat: Number(e.target.value),
                        })
                      }
                      min="0"
                    />
                    <span className={styles.macroUnit}>g</span>
                  </div>
                </div>
                <div className={styles.calorieInfo}>
                  Total Calories:{" "}
                  {Math.round(
                    settings.rest_protein * 4 +
                      settings.rest_carbs * 4 +
                      settings.rest_fat * 9
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === "history" && (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <h2>History feature coming soon!</h2>
            <p>
              This will show your past daily entries and progress over time.
            </p>
          </div>
        )}
      </main>

      {/* Add New Food Modal */}
      {showAddFoodModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Food</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowAddFoodModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddNewFood} className={styles.modalFormGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newFoodForm.name}
                  onChange={(e) =>
                    setNewFoodForm({ ...newFoodForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Portion Size</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newFoodForm.portion_size}
                  onChange={(e) =>
                    setNewFoodForm({
                      ...newFoodForm,
                      portion_size: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Protein (g)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={newFoodForm.protein}
                  onChange={(e) =>
                    setNewFoodForm({
                      ...newFoodForm,
                      protein: Number(e.target.value),
                    })
                  }
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Carbs (g)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={newFoodForm.carbs}
                  onChange={(e) =>
                    setNewFoodForm({
                      ...newFoodForm,
                      carbs: Number(e.target.value),
                    })
                  }
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Fat (g)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={newFoodForm.fat}
                  onChange={(e) =>
                    setNewFoodForm({
                      ...newFoodForm,
                      fat: Number(e.target.value),
                    })
                  }
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <button type="submit" className={styles.submitButton}>
                Add Food
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      <EditFoodModal
        food={editingFood}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingFood(null);
        }}
        onSave={handleSaveEditedFood}
      />
    </div>
  );
};

export default App;
