import React from "react";

type View = "today" | "history" | "settings";

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
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

export default Navigation;
