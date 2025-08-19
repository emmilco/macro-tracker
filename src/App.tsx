// App.tsx - Using CSS Modules instead of Tailwind
import React, { useState } from "react";
import styles from "./App.module.css";

// Types
interface Food {
  id: string;
  name: string;
  portionSize: string;
  protein: number;
  carbs: number;
  fat: number;
  frequency: number;
}

interface FoodEntry {
  foodId: string;
  multiplier: number;
}

interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
}

interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

interface Settings {
  workoutTargets: MacroTargets;
  restTargets: MacroTargets;
}

type DayType = "workout" | "rest";
type View = "today" | "history" | "settings";

// localStorage utilities
const useLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Utility functions
const getMacroPercentage = (current: number, target: number): number => {
  return Math.round((current / target) * 100);
};

const calculateMacros = (
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

const generateId = () => Math.random().toString(36).substr(2, 9);

const getTodayString = () => new Date().toISOString().split("T")[0];

// Navigation Component
const Navigation: React.FC<{
  currentView: View;
  onViewChange: (view: View) => void;
}> = ({ currentView, onViewChange }) => {
  const tabs = [
    { id: "today" as const, label: "Today" },
    { id: "history" as const, label: "History" },
    { id: "settings" as const, label: "Settings" },
  ];

  return (
    <div className={styles.navigation}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`${styles.navTab} ${
            currentView === tab.id ? styles.active : ""
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// Components
const MacroChart: React.FC<{ current: MacroTotals; targets: MacroTargets }> = ({
  current,
  targets,
}) => {
  const macros = [
    {
      name: "Protein",
      current: current.protein,
      target: targets.protein,
      type: "protein",
    },
    {
      name: "Carbs",
      current: current.carbs,
      target: targets.carbs,
      type: "carbs",
    },
    { name: "Fat", current: current.fat, target: targets.fat, type: "fat" },
  ];

  return (
    <div className={styles.macroChart}>
      {macros.map((macro) => {
        const percentage = getMacroPercentage(macro.current, macro.target);
        const heightPercentage = Math.min(percentage, 100);

        return (
          <div key={macro.name} className={styles.macroItem}>
            <div className={styles.macroLabel}>{macro.name}</div>
            <div className={styles.macroBarContainer}>
              <div className={`${styles.macroBarBg} ${styles[macro.type]}`} />
              <div
                className={`${styles.macroBar} ${
                  styles[`macroBar${macro.name}`]
                }`}
                style={{ height: `${heightPercentage}%` }}
              />
            </div>
            <div className={styles.macroValue}>
              {Math.round(macro.current)}g
            </div>
            <div className={styles.macroTarget}>of {macro.target}g</div>
          </div>
        );
      })}
    </div>
  );
};

const FoodTile: React.FC<{ food: Food; onClick: (food: Food) => void }> = ({
  food,
  onClick,
}) => {
  return (
    <div onClick={() => onClick(food)} className={styles.foodTile}>
      <div className={styles.frequencyBadge}>{food.frequency}×</div>
      <div className={styles.foodName}>{food.name}</div>
      <div className={styles.foodPortion}>{food.portionSize}</div>
      <div className={styles.foodMacros}>
        <span className={styles.macroProtein}>P: {food.protein}</span>
        <span className={styles.macroCarbs}>C: {food.carbs}</span>
        <span className={styles.macroFat}>F: {food.fat}</span>
      </div>
    </div>
  );
};

const DayTypeToggle: React.FC<{
  dayType: DayType;
  onChange: (dayType: DayType) => void;
}> = ({ dayType, onChange }) => {
  return (
    <div className={styles.dayTypeToggle}>
      <button
        onClick={() => onChange("workout")}
        className={`${styles.dayTypeBtn} ${
          dayType === "workout" ? styles.active : ""
        }`}
      >
        Workout Day
      </button>
      <button
        onClick={() => onChange("rest")}
        className={`${styles.dayTypeBtn} ${
          dayType === "rest" ? styles.active : ""
        }`}
      >
        Rest Day
      </button>
    </div>
  );
};

const AddFoodForm: React.FC<{
  onAddFood: (food: Omit<Food, "id" | "frequency">) => void;
}> = ({ onAddFood }) => {
  const [newFood, setNewFood] = useState({
    name: "",
    portionSize: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newFood.name ||
      !newFood.portionSize ||
      !newFood.protein ||
      !newFood.carbs ||
      !newFood.fat
    ) {
      return;
    }

    onAddFood({
      name: newFood.name,
      portionSize: newFood.portionSize,
      protein: parseFloat(newFood.protein),
      carbs: parseFloat(newFood.carbs),
      fat: parseFloat(newFood.fat),
    });

    setNewFood({
      name: "",
      portionSize: "",
      protein: "",
      carbs: "",
      fat: "",
    });
  };

  return (
    <div className={styles.addFoodForm}>
      <h3 className={styles.addFoodTitle}>Add New Food</h3>
      <form onSubmit={handleSubmit}>
        <div className={`${styles.formGrid} ${styles.cols5}`}>
          <input
            type="text"
            placeholder="Food name"
            value={newFood.name}
            onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
            className={`form-input ${styles.span2}`}
            required
          />
          <input
            type="text"
            placeholder="Portion size"
            value={newFood.portionSize}
            onChange={(e) =>
              setNewFood({ ...newFood, portionSize: e.target.value })
            }
            className="form-input"
            required
          />
          <input
            type="number"
            placeholder="Protein (g)"
            value={newFood.protein}
            onChange={(e) =>
              setNewFood({ ...newFood, protein: e.target.value })
            }
            className="form-input"
            step="0.1"
            min="0"
            required
          />
          <input
            type="number"
            placeholder="Carbs (g)"
            value={newFood.carbs}
            onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
            className="form-input"
            step="0.1"
            min="0"
            required
          />
        </div>
        <div className={`${styles.formGrid} ${styles.cols5}`}>
          <input
            type="number"
            placeholder="Fat (g)"
            value={newFood.fat}
            onChange={(e) => setNewFood({ ...newFood, fat: e.target.value })}
            className="form-input"
            step="0.1"
            min="0"
            required
          />
          <button type="submit" className={`btn btn-primary ${styles.start5}`}>
            Add Food
          </button>
        </div>
      </form>
    </div>
  );
};

// Today View Component
const TodayView: React.FC<{
  dayType: DayType;
  todaysFoods: FoodEntry[];
  onTodaysFoodsChange: (foods: FoodEntry[]) => void;
  foods: Food[];
  onFoodsChange: (foods: Food[]) => void;
  settings: Settings;
}> = ({
  dayType,
  todaysFoods,
  onTodaysFoodsChange,
  foods,
  onFoodsChange,
  settings,
}) => {
  const currentTargets = settings[`${dayType}Targets`];
  const currentMacros = calculateMacros(todaysFoods, foods);
  const sortedFoods = [...foods].sort((a, b) => b.frequency - a.frequency);

  const handleFoodClick = (food: Food) => {
    const existingIndex = todaysFoods.findIndex((f) => f.foodId === food.id);
    if (existingIndex >= 0) {
      const updated = [...todaysFoods];
      updated[existingIndex].multiplier += 1;
      onTodaysFoodsChange(updated);
    } else {
      onTodaysFoodsChange([...todaysFoods, { foodId: food.id, multiplier: 1 }]);
    }

    // Increment frequency
    onFoodsChange(
      foods.map((f) =>
        f.id === food.id ? { ...f, frequency: f.frequency + 1 } : f
      )
    );
  };

  const handleMultiplierChange = (foodId: string, value: string) => {
    const multiplier = parseFloat(value);
    if (!isNaN(multiplier) && multiplier > 0) {
      onTodaysFoodsChange(
        todaysFoods.map((f) => (f.foodId === foodId ? { ...f, multiplier } : f))
      );
    }
  };

  const removeFood = (foodId: string) => {
    onTodaysFoodsChange(todaysFoods.filter((f) => f.foodId !== foodId));
  };

  const addNewFood = (newFood: Omit<Food, "id" | "frequency">) => {
    const food: Food = {
      ...newFood,
      id: generateId(),
      frequency: 0,
    };
    onFoodsChange([...foods, food]);
  };

  return (
    <div>
      {/* Macro Progress */}
      <div className={styles.macroProgress}>
        <h2 className={styles.macroProgressTitle}>
          Today's Progress - {dayType === "workout" ? "Workout" : "Rest"} Day
          Targets
        </h2>
        <MacroChart current={currentMacros} targets={currentTargets} />
      </div>

      {/* Today's Foods */}
      {todaysFoods.length > 0 && (
        <div className={styles.todaysFoods}>
          <h3 className={styles.todaysFoodsTitle}>Today's Foods</h3>
          <div className={styles.foodEntries}>
            {todaysFoods.map((entry) => {
              const food = foods.find((f) => f.id === entry.foodId);
              if (!food) return null;

              return (
                <div
                  key={`${entry.foodId}-${Math.random()}`}
                  className={styles.foodEntry}
                >
                  <div className={styles.foodEntryInfo}>
                    <div className={styles.foodEntryName}>{food.name}</div>
                    <div className={styles.foodEntryMacros}>
                      <span className={styles.macroProtein}>
                        P: {Math.round(food.protein * entry.multiplier)}
                      </span>
                      <span className={styles.macroCarbs}>
                        C: {Math.round(food.carbs * entry.multiplier)}
                      </span>
                      <span className={styles.macroFat}>
                        F: {Math.round(food.fat * entry.multiplier)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.foodEntryControls}>
                    <input
                      type="number"
                      value={entry.multiplier}
                      onChange={(e) =>
                        handleMultiplierChange(entry.foodId, e.target.value)
                      }
                      className={styles.quantityInput}
                      step="0.1"
                      min="0.1"
                    />
                    <button
                      onClick={() => removeFood(entry.foodId)}
                      className="btn btn-danger"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Frequent Foods */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Frequent Foods</h2>
        <div className={styles.foodGrid}>
          {sortedFoods.map((food) => (
            <FoodTile key={food.id} food={food} onClick={handleFoodClick} />
          ))}
        </div>
      </div>

      {/* Add New Food Form */}
      <AddFoodForm onAddFood={addNewFood} />
    </div>
  );
};

// Simplified Settings View (you can expand this later)
const SettingsView: React.FC<{
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}> = ({ settings, onSettingsChange }) => {
  const [workoutTargets, setWorkoutTargets] = useState(settings.workoutTargets);
  const [restTargets, setRestTargets] = useState(settings.restTargets);

  const handleSave = () => {
    onSettingsChange({ workoutTargets, restTargets });
  };

  return (
    <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ color: "var(--primary-500)", marginBottom: "1rem" }}>
          Workout Day Targets
        </h3>
        <div className="grid grid-cols-3" style={{ marginBottom: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Protein (g)
            </label>
            <input
              type="number"
              value={workoutTargets.protein}
              onChange={(e) =>
                setWorkoutTargets({
                  ...workoutTargets,
                  protein: parseFloat(e.target.value) || 0,
                })
              }
              className="form-input"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Carbs (g)
            </label>
            <input
              type="number"
              value={workoutTargets.carbs}
              onChange={(e) =>
                setWorkoutTargets({
                  ...workoutTargets,
                  carbs: parseFloat(e.target.value) || 0,
                })
              }
              className="form-input"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Fat (g)
            </label>
            <input
              type="number"
              value={workoutTargets.fat}
              onChange={(e) =>
                setWorkoutTargets({
                  ...workoutTargets,
                  fat: parseFloat(e.target.value) || 0,
                })
              }
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ color: "var(--macro-carbs)", marginBottom: "1rem" }}>
          Rest Day Targets
        </h3>
        <div className="grid grid-cols-3" style={{ marginBottom: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Protein (g)
            </label>
            <input
              type="number"
              value={restTargets.protein}
              onChange={(e) =>
                setRestTargets({
                  ...restTargets,
                  protein: parseFloat(e.target.value) || 0,
                })
              }
              className="form-input"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Carbs (g)
            </label>
            <input
              type="number"
              value={restTargets.carbs}
              onChange={(e) =>
                setRestTargets({
                  ...restTargets,
                  carbs: parseFloat(e.target.value) || 0,
                })
              }
              className="form-input"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Fat (g)
            </label>
            <input
              type="number"
              value={restTargets.fat}
              onChange={(e) =>
                setRestTargets({
                  ...restTargets,
                  fat: parseFloat(e.target.value) || 0,
                })
              }
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <button onClick={handleSave} className="btn btn-primary">
          Save Settings
        </button>
      </div>
    </div>
  );
};

// Simplified History View
const HistoryView: React.FC = () => {
  return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "0.5rem",
        }}
      >
        No History Yet
      </h2>
      <p style={{ color: "var(--gray-500)" }}>
        Start tracking your food to see your history here!
      </p>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>("today");

  // Default data
  const defaultFoods: Food[] = [
    {
      id: "1",
      name: "8oz Ground Beef (93/7)",
      portionSize: "8 oz serving",
      protein: 48,
      carbs: 0,
      fat: 16,
      frequency: 47,
    },
    {
      id: "2",
      name: "1 cup Jasmine Rice",
      portionSize: "1 cup cooked",
      protein: 8,
      carbs: 52,
      fat: 1,
      frequency: 43,
    },
    {
      id: "3",
      name: "1 Large Banana",
      portionSize: "1 large (126g)",
      protein: 1,
      carbs: 27,
      fat: 0,
      frequency: 38,
    },
    {
      id: "4",
      name: "2 Whole Eggs",
      portionSize: "2 large eggs",
      protein: 12,
      carbs: 1,
      fat: 10,
      frequency: 35,
    },
    {
      id: "5",
      name: "1 cup Broccoli",
      portionSize: "1 cup chopped",
      protein: 3,
      carbs: 6,
      fat: 0,
      frequency: 31,
    },
    {
      id: "6",
      name: "1 tbsp Olive Oil",
      portionSize: "1 tablespoon",
      protein: 0,
      carbs: 0,
      fat: 14,
      frequency: 28,
    },
  ];

  const defaultSettings: Settings = {
    workoutTargets: { protein: 180, carbs: 250, fat: 80 },
    restTargets: { protein: 180, carbs: 150, fat: 100 },
  };

  // State with localStorage persistence
  const [foods, setFoods] = useLocalStorage<Food[]>(
    "macro-tracker-foods",
    defaultFoods
  );
  const [settings, setSettings] = useLocalStorage<Settings>(
    "macro-tracker-settings",
    defaultSettings
  );
  const [dayType, setDayType] = useLocalStorage<DayType>(
    `macro-tracker-day-type-${getTodayString()}`,
    "workout"
  );
  const [todaysFoods, setTodaysFoods] = useLocalStorage<FoodEntry[]>(
    `macro-tracker-foods-${getTodayString()}`,
    []
  );

  const renderView = () => {
    switch (currentView) {
      case "today":
        return (
          <TodayView
            dayType={dayType}
            todaysFoods={todaysFoods}
            onTodaysFoodsChange={setTodaysFoods}
            foods={foods}
            onFoodsChange={setFoods}
            settings={settings}
          />
        );
      case "history":
        return <HistoryView />;
      case "settings":
        return (
          <SettingsView settings={settings} onSettingsChange={setSettings} />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.app}>
      {/* Header */}
      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Macro Tracker</h1>
          {currentView === "today" && (
            <DayTypeToggle dayType={dayType} onChange={setDayType} />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="container">
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
      </div>

      {/* Content */}
      <div className="container">
        <div className={styles.content}>{renderView()}</div>
      </div>
    </div>
  );
};

export default App;
