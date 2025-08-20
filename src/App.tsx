import React, { useState, useEffect, useCallback } from "react";
import { dbUtils, auth } from "./supabase";
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
  // Use local timezone instead of UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString + "T00:00:00"); // Avoid timezone shifts
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Login Component
const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await auth.signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Macro Tracker</h1>
        <p className={styles.loginSubtitle}>
          Track your nutrition goals with precision
        </p>

        <button
          className={styles.loginButton}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span className={styles.googleIcon}>🔐</span>
              Sign in with Google
            </>
          )}
        </button>

        <p className={styles.loginFooter}>
          Secure authentication • Your data stays private
        </p>
      </div>
    </div>
  );
};

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
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<
    (DailyEntry & {
      foodEntries: FoodEntry[];
      macros: MacroTotals;
    })[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // App state
  const [currentTab, setCurrentTab] = useState<
    "today" | "history" | "meal-builder" | "settings"
  >("today");

  useEffect(() => {
    if (currentTab === "history" && user) {
      loadHistoryData();
    }
  }, [currentTab, user]);

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

  const [settingsForm, setSettingsForm] = useState({
    workout_protein: 180,
    workout_carbs: 250,
    workout_fat: 80,
    rest_protein: 180,
    rest_carbs: 150,
    rest_fat: 100,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        workout_protein: settings.workout_protein,
        workout_carbs: settings.workout_carbs,
        workout_fat: settings.workout_fat,
        rest_protein: settings.rest_protein,
        rest_carbs: settings.rest_carbs,
        rest_fat: settings.rest_fat,
      });
    }
  }, [settings]);

  // Meal Builder state
  const [mealForm, setMealForm] = useState({
    name: "",
    portions: 1,
  });
  const [mealFoods, setMealFoods] = useState<(Food & { quantity: number })[]>(
    []
  );
  const [mealSearchTerm, setMealSearchTerm] = useState("");

  const getTodayLocal = (): string => {
    return formatDate(new Date());
  };

  const today = getTodayLocal();

  const isToday = (dateString: string): boolean => {
    return dateString === today;
  };

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

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await auth.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        // User logged in, load their data
        await loadUserData();
      } else {
        // User logged out, clear data
        clearUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Clear user data on logout
  const clearUserData = () => {
    setFoods([]);
    setDailyEntry(null);
    setFoodEntries([]);
    setSettings(null);
    setCurrentTab("today");
  };

  // Load user data
  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if user has settings (indicates setup is complete)
      const settingsData = await dbUtils.getSettings();

      if (!settingsData) {
        // New user - set up default data
        await dbUtils.setupNewUser();
      }

      // Load all user data
      const [foodsData, settingsResult] = await Promise.all([
        dbUtils.getFoods(),
        dbUtils.getSettings(),
      ]);

      setFoods(foodsData);
      setSettings(settingsResult);

      // Load today's entry
      const todayEntry = await dbUtils.getDailyEntry(today);
      if (todayEntry) {
        setDailyEntry(todayEntry);
        setDayType(todayEntry.day_type);
        const entries = await dbUtils.getFoodEntries(todayEntry.id);
        setFoodEntries(entries);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryData = async () => {
    if (!user) return;

    try {
      setHistoryLoading(true);

      // Get all daily entries except today, ordered by date descending
      const entries = await dbUtils.getHistoricalDailyEntries(today);

      // Load food entries and calculate macros for each day
      const entriesWithData = await Promise.all(
        entries.map(async (entry) => {
          const foodEntries = await dbUtils.getFoodEntries(entry.id);
          const macros = calculateMacros(foodEntries);
          return {
            ...entry,
            foodEntries,
            macros,
          };
        })
      );

      setHistoryEntries(entriesWithData);
    } catch (error) {
      console.error("Error loading history data:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, today]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show loading screen during auth initialization
  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

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

  const hasUnsavedChanges = () => {
    if (!settings) return false;

    return (
      settingsForm.workout_protein !== settings.workout_protein ||
      settingsForm.workout_carbs !== settings.workout_carbs ||
      settingsForm.workout_fat !== settings.workout_fat ||
      settingsForm.rest_protein !== settings.rest_protein ||
      settingsForm.rest_carbs !== settings.rest_carbs ||
      settingsForm.rest_fat !== settings.rest_fat
    );
  };

  // Update settings
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSettingsLoading(true);
      setSettingsSaved(false);

      const updated = await dbUtils.updateSettings(settingsForm);
      setSettings(updated);

      // Show success feedback
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000); // Hide after 3 seconds
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSettingsLoading(false);
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
            <div className={styles.userInfo}>
              <img
                src={
                  user.user_metadata?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.user_metadata?.full_name || "User"
                  )}&background=475569&color=fff`
                }
                alt="User avatar"
                className={styles.userAvatar}
              />
              <button
                className={styles.logoutButton}
                onClick={handleLogout}
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
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
          <form onSubmit={handleSettingsSubmit}>
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
                        value={settingsForm.workout_protein}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            workout_protein: Number(e.target.value),
                          })
                        }
                        min="0"
                        required
                      />
                      <span className={styles.macroUnit}>g</span>
                    </div>
                    <div className={styles.macroInputRow}>
                      <label className={styles.macroInputLabel}>Carbs:</label>
                      <input
                        type="number"
                        className={styles.macroInput}
                        value={settingsForm.workout_carbs}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            workout_carbs: Number(e.target.value),
                          })
                        }
                        min="0"
                        required
                      />
                      <span className={styles.macroUnit}>g</span>
                    </div>
                    <div className={styles.macroInputRow}>
                      <label className={styles.macroInputLabel}>Fat:</label>
                      <input
                        type="number"
                        className={styles.macroInput}
                        value={settingsForm.workout_fat}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            workout_fat: Number(e.target.value),
                          })
                        }
                        min="0"
                        required
                      />
                      <span className={styles.macroUnit}>g</span>
                    </div>
                  </div>
                  <div className={styles.calorieInfo}>
                    Total Calories:{" "}
                    {Math.round(
                      settingsForm.workout_protein * 4 +
                        settingsForm.workout_carbs * 4 +
                        settingsForm.workout_fat * 9
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
                        value={settingsForm.rest_protein}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            rest_protein: Number(e.target.value),
                          })
                        }
                        min="0"
                        required
                      />
                      <span className={styles.macroUnit}>g</span>
                    </div>
                    <div className={styles.macroInputRow}>
                      <label className={styles.macroInputLabel}>Carbs:</label>
                      <input
                        type="number"
                        className={styles.macroInput}
                        value={settingsForm.rest_carbs}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            rest_carbs: Number(e.target.value),
                          })
                        }
                        min="0"
                        required
                      />
                      <span className={styles.macroUnit}>g</span>
                    </div>
                    <div className={styles.macroInputRow}>
                      <label className={styles.macroInputLabel}>Fat:</label>
                      <input
                        type="number"
                        className={styles.macroInput}
                        value={settingsForm.rest_fat}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            rest_fat: Number(e.target.value),
                          })
                        }
                        min="0"
                        required
                      />
                      <span className={styles.macroUnit}>g</span>
                    </div>
                  </div>
                  <div className={styles.calorieInfo}>
                    Total Calories:{" "}
                    {Math.round(
                      settingsForm.rest_protein * 4 +
                        settingsForm.rest_carbs * 4 +
                        settingsForm.rest_fat * 9
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button Section */}
            <div className={styles.settingsSubmitSection}>
              <button
                type="submit"
                className={`${styles.settingsSubmitButton} ${
                  hasUnsavedChanges() ? styles.hasChanges : ""
                }`}
                disabled={settingsLoading || !hasUnsavedChanges()}
              >
                {settingsLoading ? (
                  <span className={styles.submitButtonLoading}>
                    <span className={styles.spinner}></span>
                    Saving...
                  </span>
                ) : settingsSaved ? (
                  <span className={styles.submitButtonSuccess}>
                    ✓ Settings Saved!
                  </span>
                ) : hasUnsavedChanges() ? (
                  "Save Changes"
                ) : (
                  "No Changes"
                )}
              </button>

              {hasUnsavedChanges() && (
                <button
                  type="button"
                  className={styles.settingsResetButton}
                  onClick={() => {
                    if (settings) {
                      setSettingsForm({
                        workout_protein: settings.workout_protein,
                        workout_carbs: settings.workout_carbs,
                        workout_fat: settings.workout_fat,
                        rest_protein: settings.rest_protein,
                        rest_carbs: settings.rest_carbs,
                        rest_fat: settings.rest_fat,
                      });
                    }
                  }}
                >
                  Reset Changes
                </button>
              )}
            </div>
          </form>
        )}

        {currentTab === "history" && (
          <div className={styles.historyContainer}>
            <h2 className={styles.sectionTitle}>Nutrition History</h2>

            {historyLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading history...</p>
              </div>
            ) : historyEntries.length === 0 ? (
              <div className={styles.noHistory}>
                <p>No history available yet.</p>
                <p className={styles.noHistoryHint}>
                  Start tracking your daily nutrition to see your progress over
                  time!
                </p>
              </div>
            ) : (
              <div className={styles.historyList}>
                {historyEntries.map((entry) => {
                  const targets = getTargets(settings, entry.day_type);
                  const entryDate = new Date(entry.date + "T00:00:00"); // Avoid timezone shifts
                  const daysDiff = Math.floor(
                    (new Date().getTime() - entryDate.getTime()) /
                      (24 * 60 * 60 * 1000)
                  );
                  const isRecent = daysDiff <= 7; // Within 7 days

                  return (
                    <div
                      key={entry.id}
                      className={`${styles.historyEntry} ${
                        isRecent ? styles.recentEntry : ""
                      }`}
                    >
                      <div className={styles.historyHeader}>
                        <div className={styles.historyDate}>
                          <h3>{formatDateForDisplay(entry.date)}</h3>
                          <span className={styles.dayTypeBadge}>
                            {entry.day_type === "workout"
                              ? "💪 Workout"
                              : "🧘 Rest"}{" "}
                            Day
                          </span>
                        </div>
                        <div className={styles.historyMacros}>
                          <div className={styles.caloriesDisplay}>
                            <div className={styles.caloriesValue}>
                              {entry.macros.calories}
                            </div>
                            <div className={styles.caloriesLabel}>Calories</div>
                          </div>
                        </div>
                      </div>

                      {/* Macro Progress Bars for History */}
                      <div className={styles.historyMacroProgress}>
                        <MacroBar
                          label="Protein"
                          current={entry.macros.protein}
                          target={targets.protein}
                          color="protein"
                        />
                        <MacroBar
                          label="Carbs"
                          current={entry.macros.carbs}
                          target={targets.carbs}
                          color="carbs"
                        />
                        <MacroBar
                          label="Fat"
                          current={entry.macros.fat}
                          target={targets.fat}
                          color="fat"
                        />
                      </div>

                      {/* Food Items */}
                      {entry.foodEntries.length > 0 && (
                        <div className={styles.historyFoods}>
                          <h4 className={styles.historyFoodsTitle}>
                            Foods ({entry.foodEntries.length} item
                            {entry.foodEntries.length !== 1 ? "s" : ""})
                          </h4>
                          <div className={styles.historyFoodsList}>
                            {entry.foodEntries.map((foodEntry) => (
                              <div
                                key={foodEntry.id}
                                className={styles.historyFoodItem}
                              >
                                <div className={styles.historyFoodInfo}>
                                  <span className={styles.historyFoodName}>
                                    {foodEntry.food_name}
                                    {foodEntry.multiplier !== 1 &&
                                      ` × ${foodEntry.multiplier}`}
                                  </span>
                                  <span className={styles.historyFoodMacros}>
                                    P:{" "}
                                    {Math.round(
                                      foodEntry.food_protein *
                                        foodEntry.multiplier
                                    )}
                                    g, C:{" "}
                                    {Math.round(
                                      foodEntry.food_carbs *
                                        foodEntry.multiplier
                                    )}
                                    g, F:{" "}
                                    {Math.round(
                                      foodEntry.food_fat * foodEntry.multiplier
                                    )}
                                    g
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Stats */}
                      <div className={styles.historySummary}>
                        <div className={styles.summaryStats}>
                          <div className={styles.summaryState}>
                            <span className={styles.summaryLabel}>
                              Protein:
                            </span>
                            <span
                              className={`${styles.summaryValue} ${
                                entry.macros.protein >= targets.protein
                                  ? styles.targetMet
                                  : styles.targetMissed
                              }`}
                            >
                              {entry.macros.protein}g / {targets.protein}g
                            </span>
                          </div>
                          <div className={styles.summaryState}>
                            <span className={styles.summaryLabel}>Carbs:</span>
                            <span
                              className={`${styles.summaryValue} ${
                                entry.macros.carbs >= targets.carbs
                                  ? styles.targetMet
                                  : styles.targetMissed
                              }`}
                            >
                              {entry.macros.carbs}g / {targets.carbs}g
                            </span>
                          </div>
                          <div className={styles.summaryState}>
                            <span className={styles.summaryLabel}>Fat:</span>
                            <span
                              className={`${styles.summaryValue} ${
                                entry.macros.fat >= targets.fat
                                  ? styles.targetMet
                                  : styles.targetMissed
                              }`}
                            >
                              {entry.macros.fat}g / {targets.fat}g
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
