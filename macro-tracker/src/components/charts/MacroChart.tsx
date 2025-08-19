import React from "react";
import { MacroTotals, MacroTargets } from "../../types";
import { getMacroPercentage } from "../../utils/calculations";

interface MacroChartProps {
  current: MacroTotals;
  targets: MacroTargets;
}

const MacroChart: React.FC<MacroChartProps> = ({ current, targets }) => {
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
              {/* Background bar (target) */}
              <div
                className={`absolute bottom-0 w-full h-full rounded-t-lg ${macro.bgColor}`}
              />

              {/* Current bar */}
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

export default MacroChart;
