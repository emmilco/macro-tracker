import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { calculateMacros } from "../utils/calculations";
import MacroChart from "../components/charts/MacroChart";
import FoodTile from "../components/ui/FoodTile";
import { Food } from "../types";
import { v4 as uuidv4 } from "uuid";

const TodayView: React.FC = () => {
  const {
    foods,
    addFood,
    getTodayEntry,
    addFoodToToday,
    removeFoodFromToday,
    updateFoodMultiplier,
    settings,
  } = useApp();

  const [newFood, setNewFood] = useState({
    name: "",
    portionSize: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const todayEntry = getTodayEntry();
  const currentTargets =
    todayEntry.dayType === "workout"
      ? settings.workoutTargets
      : settings.restTargets;

  const currentMacros = calculateMacros(todayEntry.foods, foods);

  // Sort foods by frequency (most used first)
  const sortedFoods = [...foods].sort((a, b) => b.frequency - a.frequency);

  const handleFoodClick = (food: Food) => {
    addFoodToToday(food.id);
  };

  const handleAddNewFood = (e: React.FormEvent) => {
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

    addFood({
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

  const handleMultiplierChange = (foodId: string, value: string) => {
    const multiplier = parseFloat(value);
    if (!isNaN(multiplier) && multiplier > 0) {
      updateFoodMultiplier(foodId, multiplier);
    }
  };

  return (
    <div className="space-y-6">
      {/* Macro Progress */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
        <h2 className="font-semibold text-gray-700 mb-5 text-base">
          Today's Progress -{" "}
          {todayEntry.dayType === "workout" ? "Workout" : "Rest"} Day Targets
        </h2>
        <MacroChart current={currentMacros} targets={currentTargets} />
      </div>

      {/* Today's Foods */}
      {todayEntry.foods.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-600 mb-4">Today's Foods</h3>
          <div className="space-y-3">
            {todayEntry.foods.map((entry) => {
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
                      onClick={() => removeFoodFromToday(entry.foodId)}
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

      {/* Add New Food */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Add New Food</h3>
        <form onSubmit={handleAddNewFood} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Food name"
              value={newFood.name}
              onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
            <input
              type="text"
              placeholder="Portion size"
              value={newFood.portionSize}
              onChange={(e) =>
                setNewFood({ ...newFood, portionSize: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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
            />
            <input
              type="number"
              placeholder="Carbs (g)"
              value={newFood.carbs}
              onChange={(e) =>
                setNewFood({ ...newFood, carbs: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              step="0.1"
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
    </div>
  );
};

export default TodayView;
