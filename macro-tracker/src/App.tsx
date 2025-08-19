// Complete Macro Tracker App with Navigation, Settings, and History
import React, { useState, useEffect } from "react";

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

interface DayEntry {
  date: string;
  dayType: DayType;
  foods: FoodEntry[];
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

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
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`py-4 px-6 font-medium border-b-3 transition-all duration-200 ${
            currentView === tab.id
              ? "text-primary-500 border-primary-500"
              : "text-gray-500 border-transparent hover:text-gray-700"
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
      color: "bg-macro-protein",
      bgColor: "bg-macro-protein/20",
    },
    {
      name: "Carbs",
      current: current.carbs,
      target: targets.carbs,
      color: "bg-macro-carbs",
      bgColor: "bg-macro-carbs/20",
    },
    {
      name: "Fat",
      current: current.fat,
      target: targets.fat,
      color: "bg-macro-fat",
      bgColor: "bg-macro-fat/20",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {macros.map((macro) => {
        const percentage = getMacroPercentage(macro.current, macro.target);
        const heightPercentage = Math.min(percentage, 100);

        return (
          <div key={macro.name} className="text-center">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {macro.name}
            </div>
            <div className="relative h-32 w-16 mx-auto mb-3 flex items-end">
              <div
                className={`absolute bottom-0 w-full h-full rounded-t-lg ${macro.bgColor}`}
              />
              <div
                className={`w-full rounded-t-lg ${macro.color} transition-all duration-500 ease-out relative z-10`}
                style={{ height: `${heightPercentage}%` }}
              />
            </div>
            <div className="text-base font-semibold text-gray-700">
              {Math.round(macro.current)}g
            </div>
            <div className="text-sm text-gray-500">of {macro.target}g</div>
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
    <div
      onClick={() => onClick(food)}
      className="relative border border-gray-200 rounded-xl p-4 cursor-pointer transition-all duration-200 bg-white hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="absolute top-3 right-3 bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded-lg">
        {food.frequency}×
      </div>
      <div className="font-semibold text-gray-700 mb-1.5 text-sm pr-12">
        {food.name}
      </div>
      <div className="text-xs text-gray-500 mb-2.5">{food.portionSize}</div>
      <div className="flex gap-4 text-xs font-semibold">
        <span className="text-macro-protein">P: {food.protein}</span>
        <span className="text-macro-carbs">C: {food.carbs}</span>
        <span className="text-macro-fat">F: {food.fat}</span>
      </div>
    </div>
  );
};

const DayTypeToggle: React.FC<{
  dayType: DayType;
  onChange: (dayType: DayType) => void;
}> = ({ dayType, onChange }) => {
  return (
    <div className="flex bg-white/15 backdrop-blur-sm rounded-xl p-1.5 gap-1 max-w-80 mx-auto">
      <button
        onClick={() => onChange("workout")}
        className={`flex-1 py-3 px-6 rounded-lg transition-all duration-300 font-medium ${
          dayType === "workout"
            ? "bg-white text-primary-500 shadow-lg font-semibold"
            : "text-white/80 hover:text-white"
        }`}
      >
        Workout Day
      </button>
      <button
        onClick={() => onChange("rest")}
        className={`flex-1 py-3 px-6 rounded-lg transition-all duration-300 font-medium ${
          dayType === "rest"
            ? "bg-white text-primary-500 shadow-lg font-semibold"
            : "text-white/80 hover:text-white"
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
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-700 mb-4">Add New Food</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Food name"
            value={newFood.name}
            onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
            className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            required
          />
          <input
            type="text"
            placeholder="Portion size"
            value={newFood.portionSize}
            onChange={(e) =>
              setNewFood({ ...newFood, portionSize: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            required
          />
          <input
            type="number"
            placeholder="Protein (g)"
            value={newFood.protein}
            onChange={(e) =>
              setNewFood({ ...newFood, protein: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            step="0.1"
            min="0"
            required
          />
          <input
            type="number"
            placeholder="Carbs (g)"
            value={newFood.carbs}
            onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            step="0.1"
            min="0"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="number"
            placeholder="Fat (g)"
            value={newFood.fat}
            onChange={(e) => setNewFood({ ...newFood, fat: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            step="0.1"
            min="0"
            required
          />
          <button
            type="submit"
            className="md:col-start-5 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
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
  onDayTypeChange: (dayType: DayType) => void;
  todaysFoods: FoodEntry[];
  onTodaysFoodsChange: (foods: FoodEntry[]) => void;
  foods: Food[];
  onFoodsChange: (foods: Food[]) => void;
  settings: Settings;
}> = ({
  dayType,
  onDayTypeChange,
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
    <div className="space-y-6">
      {/* Macro Progress */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-5 text-base">
          Today's Progress - {dayType === "workout" ? "Workout" : "Rest"} Day
          Targets
        </h2>
        <MacroChart current={currentMacros} targets={currentTargets} />
      </div>

      {/* Today's Foods */}
      {todaysFoods.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-600 mb-4">Today's Foods</h3>
          <div className="space-y-3">
            {todaysFoods.map((entry) => {
              const food = foods.find((f) => f.id === entry.foodId);
              if (!food) return null;

              return (
                <div
                  key={`${entry.foodId}-${Math.random()}`}
                  className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-100"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-700 text-sm">
                      {food.name}
                    </div>
                    <div className="flex gap-4 text-xs font-semibold mt-1">
                      <span className="text-macro-protein">
                        P: {Math.round(food.protein * entry.multiplier)}
                      </span>
                      <span className="text-macro-carbs">
                        C: {Math.round(food.carbs * entry.multiplier)}
                      </span>
                      <span className="text-macro-fat">
                        F: {Math.round(food.fat * entry.multiplier)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={entry.multiplier}
                      onChange={(e) =>
                        handleMultiplierChange(entry.foodId, e.target.value)
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm font-medium"
                      step="0.1"
                      min="0.1"
                    />
                    <button
                      onClick={() => removeFood(entry.foodId)}
                      className="w-8 h-8 bg-red-400 hover:bg-red-500 text-white rounded-lg flex items-center justify-center transition-colors"
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
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Frequent Foods
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

// Settings View Component
const SettingsView: React.FC<{
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}> = ({ settings, onSettingsChange }) => {
  const [workoutTargets, setWorkoutTargets] = useState(settings.workoutTargets);
  const [restTargets, setRestTargets] = useState(settings.restTargets);

  const handleSave = () => {
    onSettingsChange({
      workoutTargets,
      restTargets,
    });
  };

  const calculateCalories = (macros: MacroTargets) => {
    return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary-500 mb-4">
          Workout Day Targets
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>
        <div className="text-center text-sm text-gray-600">
          Total Calories: ~{calculateCalories(workoutTargets).toLocaleString()}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-macro-carbs mb-4">
          Rest Day Targets
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>
        <div className="text-center text-sm text-gray-600">
          Total Calories: ~{calculateCalories(restTargets).toLocaleString()}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSave}
          className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

// History View Component
const HistoryView: React.FC<{
  foods: Food[];
  settings: Settings;
}> = ({ foods, settings }) => {
  const [historyEntries, setHistoryEntries] = useState<DayEntry[]>([]);

  useEffect(() => {
    // Load all historical entries from localStorage
    const entries: DayEntry[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      const dayType = localStorage.getItem(
        `macro-tracker-day-type-${dateString}`
      );
      const foodsData = localStorage.getItem(
        `macro-tracker-foods-${dateString}`
      );

      if (dayType && foodsData) {
        try {
          entries.push({
            date: dateString,
            dayType: JSON.parse(dayType) as DayType,
            foods: JSON.parse(foodsData) as FoodEntry[],
          });
        } catch (error) {
          console.error("Error parsing history data:", error);
        }
      }
    }

    setHistoryEntries(entries.sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  if (historyEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          No History Yet
        </h2>
        <p className="text-gray-500">
          Start tracking your food to see your history here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {historyEntries.map((entry) => {
        const targets = settings[`${entry.dayType}Targets`];
        const macros = calculateMacros(entry.foods, foods);

        return (
          <div
            key={entry.date}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">
                  {formatDate(entry.date)}
                </h3>
                <p className="text-sm text-gray-500">{entry.date}</p>
              </div>
              <div
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  entry.dayType === "workout"
                    ? "bg-primary-100 text-primary-600"
                    : "bg-green-100 text-macro-carbs"
                }`}
              >
                {entry.dayType === "workout" ? "Workout Day" : "Rest Day"}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">
                Foods consumed:
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                {entry.foods.map((foodEntry) => {
                  const food = foods.find((f) => f.id === foodEntry.foodId);
                  return food ? (
                    <div key={`${foodEntry.foodId}-${foodEntry.multiplier}`}>
                      {food.name} × {foodEntry.multiplier}
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  name: "Protein",
                  current: macros.protein,
                  target: targets.protein,
                  color: "text-macro-protein",
                },
                {
                  name: "Carbs",
                  current: macros.carbs,
                  target: targets.carbs,
                  color: "text-macro-carbs",
                },
                {
                  name: "Fat",
                  current: macros.fat,
                  target: targets.fat,
                  color: "text-macro-fat",
                },
              ].map((macro) => {
                const percentage = getMacroPercentage(
                  macro.current,
                  macro.target
                );
                return (
                  <div
                    key={macro.name}
                    className="text-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                      {macro.name}
                    </div>
                    <div className="font-semibold text-gray-800">
                      {Math.round(macro.current)}g / {macro.target}g
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        percentage > 110
                          ? "text-red-500"
                          : percentage >= 90
                          ? "text-green-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {percentage > 100 ? "OVER" : `${percentage}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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
            onDayTypeChange={setDayType}
            todaysFoods={todaysFoods}
            onTodaysFoodsChange={setTodaysFoods}
            foods={foods}
            onFoodsChange={setFoods}
            settings={settings}
          />
        );
      case "history":
        return <HistoryView foods={foods} settings={settings} />;
      case "settings":
        return (
          <SettingsView settings={settings} onSettingsChange={setSettings} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Macro Tracker</h1>
          {currentView === "today" && (
            <DayTypeToggle dayType={dayType} onChange={setDayType} />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-6">
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">{renderView()}</div>
    </div>
  );
};

export default App;
