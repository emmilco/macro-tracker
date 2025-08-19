import React from "react";
import { DayType } from "../../types";

interface DayTypeToggleProps {
  dayType: DayType;
  onChange: (dayType: DayType) => void;
}

const DayTypeToggle: React.FC<DayTypeToggleProps> = ({ dayType, onChange }) => {
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

export default DayTypeToggle;
