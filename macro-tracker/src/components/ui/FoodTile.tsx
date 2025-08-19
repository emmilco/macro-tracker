import React from "react";
import { Food } from "../../types";

interface FoodTileProps {
  food: Food;
  onClick: (food: Food) => void;
}

const FoodTile: React.FC<FoodTileProps> = ({ food, onClick }) => {
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

export default FoodTile;
