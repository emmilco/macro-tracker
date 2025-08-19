import React, { createContext, useContext, ReactNode } from "react";
import { Food, DayEntry, UserSettings, DayType } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { getTodayString } from "../utils/calculations";
import { v4 as uuidv4 } from "uuid";

interface AppContextType {
  // Foods
  foods: Food[];
  addFood: (food: Omit<Food, "id" | "frequency" | "lastUsed">) => void;
  incrementFoodFrequency: (foodId: string) => void;

  // Days
  days: DayEntry[];
  getTodayEntry: () => DayEntry;
  updateTodayEntry: (entry: Partial<DayEntry>) => void;
  addFoodToToday: (foodId: string, multiplier?: number) => void;
  removeFoodFromToday: (foodId: string) => void;
  updateFoodMultiplier: (foodId: string, multiplier: number) => void;
  setTodayDayType: (dayType: DayType) => void;

  // Settings
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: UserSettings = {
  workoutTargets: { protein: 180, carbs: 250, fat: 80 },
  restTargets: { protein: 180, carbs: 150, fat: 100 },
};

const defaultFoods: Food[] = [
  {
    id: "1",
    name: "8oz Ground Beef (93/7)",
    portionSize: "8 oz serving",
    protein: 48,
    carbs: 0,
    fat: 16,
    frequency: 47,
    lastUsed: new Date(),
  },
  {
    id: "2",
    name: "1 cup Jasmine Rice",
    portionSize: "1 cup cooked",
    protein: 8,
    carbs: 52,
    fat: 1,
    frequency: 43,
    lastUsed: new Date(),
  },
  {
    id: "3",
    name: "1 Large Banana",
    portionSize: "1 large (126g)",
    protein: 1,
    carbs: 27,
    fat: 0,
    frequency: 38,
    lastUsed: new Date(),
  },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [foods, setFoods] = useLocalStorage<Food[]>(
    "macro-tracker-foods",
    defaultFoods
  );
  const [days, setDays] = useLocalStorage<DayEntry[]>("macro-tracker-days", []);
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    "macro-tracker-settings",
    defaultSettings
  );

  const addFood = (newFood: Omit<Food, "id" | "frequency" | "lastUsed">) => {
    const food: Food = {
      ...newFood,
      id: uuidv4(),
      frequency: 0,
      lastUsed: new Date(),
    };
    setFoods((prev) => [...prev, food]);
  };

  const incrementFoodFrequency = (foodId: string) => {
    setFoods((prev) =>
      prev.map((food) =>
        food.id === foodId
          ? { ...food, frequency: food.frequency + 1, lastUsed: new Date() }
          : food
      )
    );
  };

  const getTodayEntry = (): DayEntry => {
    const today = getTodayString();
    const existingEntry = days.find((day) => day.date === today);

    if (existingEntry) {
      return existingEntry;
    }

    // Create new entry for today
    const newEntry: DayEntry = {
      date: today,
      dayType: "workout",
      foods: [],
    };

    setDays((prev) => [...prev, newEntry]);
    return newEntry;
  };

  const updateTodayEntry = (updates: Partial<DayEntry>) => {
    const today = getTodayString();
    setDays((prev) =>
      prev.map((day) => (day.date === today ? { ...day, ...updates } : day))
    );
  };

  const addFoodToToday = (foodId: string, multiplier = 1) => {
    const todayEntry = getTodayEntry();
    const existingFoodIndex = todayEntry.foods.findIndex(
      (f) => f.foodId === foodId
    );

    if (existingFoodIndex >= 0) {
      // Update existing food entry
      const updatedFoods = [...todayEntry.foods];
      updatedFoods[existingFoodIndex].multiplier += multiplier;
      updateTodayEntry({ foods: updatedFoods });
    } else {
      // Add new food entry
      updateTodayEntry({
        foods: [...todayEntry.foods, { foodId, multiplier }],
      });
    }

    incrementFoodFrequency(foodId);
  };

  const removeFoodFromToday = (foodId: string) => {
    const todayEntry = getTodayEntry();
    updateTodayEntry({
      foods: todayEntry.foods.filter((f) => f.foodId !== foodId),
    });
  };

  const updateFoodMultiplier = (foodId: string, multiplier: number) => {
    const todayEntry = getTodayEntry();
    updateTodayEntry({
      foods: todayEntry.foods.map((f) =>
        f.foodId === foodId ? { ...f, multiplier } : f
      ),
    });
  };

  const setTodayDayType = (dayType: DayType) => {
    updateTodayEntry({ dayType });
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const value: AppContextType = {
    foods,
    addFood,
    incrementFoodFrequency,
    days,
    getTodayEntry,
    updateTodayEntry,
    addFoodToToday,
    removeFoodFromToday,
    updateFoodMultiplier,
    setTodayDayType,
    settings,
    updateSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
