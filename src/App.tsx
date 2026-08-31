import React, { useCallback, useEffect, useMemo, useState } from "react";
import { dbUtils } from "./api";
import type {
  Food,
  DailyEntry,
  FoodEntry,
  UserSettings,
  MacroTotals,
  MacroTargets,
} from "./types";
import { Icon, SearchOverlay, Sheet, useConfirm, useToast } from "./ui";
import styles from "./App.module.css";

// ----- utility functions ------------------------------------------------

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

const calculateTargetCalories = (targets: MacroTargets): number =>
  Math.round(targets.protein * 4 + targets.carbs * 4 + targets.fat * 9);

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatEntryTime = (iso: string | undefined): string => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const shiftDate = (dateString: string, days: number): string => {
  const d = new Date(dateString + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// ----- shared subcomponents --------------------------------------------

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
}

const MacroBar: React.FC<MacroBarProps> = ({ label, current, target, color }) => {
  const raw = target > 0 ? (current / target) * 100 : 0;
  const filled = Math.min(raw, 100);
  const over = raw > 100;
  return (
    <div className={styles.macroBar}>
      <div className={styles.macroBarChart}>
        <div
          className={`${styles.macroBarFill} ${styles[`${color}Bar`]} ${
            over ? styles.macroBarOver : ""
          }`}
          style={{ height: `${filled}%` }}
        />
      </div>
      <div className={styles.macroLabel}>{label}</div>
      <div className={styles.macroValues}>
        {current}g / {target}g
      </div>
    </div>
  );
};

interface FoodFormFields {
  name: string;
  portion_size: string;
  protein: number | "";
  carbs: number | "";
  fat: number | "";
}

const emptyFoodForm: FoodFormFields = {
  name: "",
  portion_size: "",
  protein: "",
  carbs: "",
  fat: "",
};

interface FoodFormProps {
  initial?: FoodFormFields;
  submitLabel: string;
  onSubmit: (values: {
    name: string;
    portion_size: string;
    protein: number;
    carbs: number;
    fat: number;
  }) => void | Promise<void>;
}

const FoodForm: React.FC<FoodFormProps> = ({
  initial,
  submitLabel,
  onSubmit,
}) => {
  // Initial only seeds state on mount. Callers control resets by re-mounting
  // the form (Sheet unmounts children on close), so no useEffect sync — a
  // parent re-render must not clobber the user's in-progress input.
  const [form, setForm] = useState<FoodFormFields>(initial ?? emptyFoodForm);

  const set = <K extends keyof FoodFormFields>(k: K, v: FoodFormFields[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const numeric = (raw: string): number | "" => {
    if (raw === "") return "";
    const n = Number(raw);
    return Number.isFinite(n) ? n : "";
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.portion_size.trim()) return;
    onSubmit({
      name: form.name.trim(),
      portion_size: form.portion_size.trim(),
      protein: form.protein === "" ? 0 : form.protein,
      carbs: form.carbs === "" ? 0 : form.carbs,
      fat: form.fat === "" ? 0 : form.fat,
    });
  };

  return (
    <form onSubmit={submit} className={styles.modalFormGrid}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Name</label>
        <input
          type="text"
          className={styles.formInput}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          autoFocus
          autoComplete="off"
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Portion Size</label>
        <input
          type="text"
          className={styles.formInput}
          value={form.portion_size}
          onChange={(e) => set("portion_size", e.target.value)}
          placeholder="e.g. 1 cup, 100g, 4 oz"
          required
          autoComplete="off"
        />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Protein (g)</label>
          <input
            type="number"
            inputMode="decimal"
            className={styles.formInput}
            value={form.protein}
            onChange={(e) => set("protein", numeric(e.target.value))}
            min="0"
            step="0.1"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Carbs (g)</label>
          <input
            type="number"
            inputMode="decimal"
            className={styles.formInput}
            value={form.carbs}
            onChange={(e) => set("carbs", numeric(e.target.value))}
            min="0"
            step="0.1"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Fat (g)</label>
          <input
            type="number"
            inputMode="decimal"
            className={styles.formInput}
            value={form.fat}
            onChange={(e) => set("fat", numeric(e.target.value))}
            min="0"
            step="0.1"
          />
        </div>
      </div>
      <button type="submit" className={styles.submitButton}>
        {submitLabel}
      </button>
    </form>
  );
};

interface FoodTileProps {
  food: Food;
  onAdd: (food: Food) => void;
  onEdit: (food: Food) => void;
  onDelete: (food: Food) => void;
}

const FoodTile: React.FC<FoodTileProps> = ({
  food,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMenu]);

  return (
    <div className={styles.foodTile}>
      <button
        type="button"
        className={styles.foodTileMain}
        onClick={() => onAdd(food)}
      >
        <div className={styles.foodTileTop}>
          <span className={styles.foodName}>{food.name}</span>
          {food.frequency > 0 && (
            <span className={styles.frequency}>{food.frequency}×</span>
          )}
        </div>
        <div className={styles.foodInfo}>
          <span className={styles.portionSize}>{food.portion_size}</span>
          <span className={styles.macroInfo}>
            <span>P{food.protein}</span>
            <span>C{food.carbs}</span>
            <span>F{food.fat}</span>
          </span>
        </div>
      </button>
      <div className={styles.foodActions}>
        <button
          type="button"
          className={styles.foodMenu}
          aria-label="Food options"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((s) => !s);
          }}
        >
          <Icon.Dots />
        </button>
        {showMenu && (
          <div
            className={styles.foodMenuDropdown}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.foodMenuOption}
              onClick={() => {
                onEdit(food);
                setShowMenu(false);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className={`${styles.foodMenuOption} ${styles.foodMenuDelete}`}
              onClick={() => {
                onDelete(food);
                setShowMenu(false);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ----- skeleton --------------------------------------------------------

const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({
  width = "100%",
  height = "1rem",
}) => (
  <span
    className={styles.skeleton}
    style={{ width, height, display: "inline-block" }}
  />
);

const TodaySkeleton: React.FC = () => (
  <div className={styles.macroProgress}>
    {["p", "c", "f", "cal"].map((k) => (
      <div key={k} className={styles.macroBar}>
        <span className={`${styles.skeleton} ${styles.skeletonBar}`} />
        <SkeletonLine width="3rem" height="0.7rem" />
      </div>
    ))}
  </div>
);

// ----- Today view -----------------------------------------------------

interface TodayViewProps {
  viewingDate: string;
  today: string;
  setViewingDate: (d: string) => void;
  dailyEntry: DailyEntry | null;
  dayType: "workout" | "rest";
  onDayTypeChange: (t: "workout" | "rest") => void;
  foodEntries: FoodEntry[];
  currentMacros: MacroTotals;
  targets: MacroTargets;
  foods: Food[];
  onAddFood: (food: Food) => void;
  onEditFood: (food: Food) => void;
  onDeleteFood: (food: Food) => void;
  onUpdateMultiplier: (id: string, m: number) => void;
  onRemoveEntry: (id: string) => void;
  onCopyYesterday: () => void;
  onAddNewFood: (initialName?: string) => void;
  loadingDay: boolean;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}

const TodayView: React.FC<TodayViewProps> = ({
  viewingDate,
  today,
  setViewingDate,
  dayType,
  onDayTypeChange,
  foodEntries,
  currentMacros,
  targets,
  foods,
  onAddFood,
  onEditFood,
  onDeleteFood,
  onUpdateMultiplier,
  onRemoveEntry,
  onCopyYesterday,
  onAddNewFood,
  loadingDay,
  searchTerm,
  setSearchTerm,
}) => {
  const [searchActive, setSearchActive] = useState(false);
  const filteredFoods = useMemo(
    () =>
      foods.filter((f) =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [foods, searchTerm]
  );

  const isToday = viewingDate === today;
  const dateDelta = Math.round(
    (new Date(today + "T00:00:00").getTime() -
      new Date(viewingDate + "T00:00:00").getTime()) /
      86400000
  );

  return (
    <>
      <div className={styles.dateBar}>
        <button
          type="button"
          className={styles.dateArrow}
          aria-label="Previous day"
          onClick={() => setViewingDate(shiftDate(viewingDate, -1))}
        >
          <Icon.Chevron className={styles.chevronLeft} />
        </button>
        <div className={styles.dateBarCenter}>
          <div className={styles.dateBarTitle}>
            {isToday ? "Today" : dateDelta === 1 ? "Yesterday" : formatShortDate(viewingDate)}
          </div>
          {!isToday && (
            <button
              type="button"
              className={styles.dateBarBackToToday}
              onClick={() => setViewingDate(today)}
            >
              Back to today
            </button>
          )}
        </div>
        <button
          type="button"
          className={styles.dateArrow}
          aria-label="Next day"
          disabled={isToday}
          onClick={() => setViewingDate(shiftDate(viewingDate, 1))}
        >
          <Icon.Chevron />
        </button>
      </div>

      <div className={styles.dayTypeToggle}>
        <button
          type="button"
          className={`${styles.dayTypeButton} ${
            dayType === "workout" ? styles.active : ""
          }`}
          onClick={() => onDayTypeChange("workout")}
        >
          <Icon.Dumbbell size={16} /> Workout
        </button>
        <button
          type="button"
          className={`${styles.dayTypeButton} ${
            dayType === "rest" ? styles.active : ""
          }`}
          onClick={() => onDayTypeChange("rest")}
        >
          <Icon.Rest size={16} /> Rest
        </button>
      </div>

      {loadingDay ? (
        <TodaySkeleton />
      ) : (
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
            <div className={styles.caloriesRow}>
              <span className={styles.caloriesValue}>
                {currentMacros.calories}
              </span>
              <span className={styles.caloriesTarget}>
                / {calculateTargetCalories(targets)}
              </span>
            </div>
            <div className={styles.caloriesLabel}>Calories</div>
          </div>
        </div>
      )}

      {foodEntries.length === 0 && !loadingDay && (
        <div className={styles.emptyDay}>
          <p>Nothing logged {isToday ? "today" : "on this day"} yet.</p>
          <button
            type="button"
            className={styles.copyYesterdayButton}
            onClick={onCopyYesterday}
          >
            <Icon.Copy size={16} /> Copy{" "}
            {isToday ? "yesterday" : "previous day"}
          </button>
        </div>
      )}

      {foodEntries.length > 0 && (
        <div className={styles.todaysFoods}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {isToday ? "Today's Foods" : "Foods"}
            </h2>
            <span className={styles.sectionCount}>
              {foodEntries.length} item{foodEntries.length !== 1 ? "s" : ""}
            </span>
          </div>
          {foodEntries.map((entry) => {
            const p = Math.round(entry.food_protein * entry.multiplier);
            const c = Math.round(entry.food_carbs * entry.multiplier);
            const f = Math.round(entry.food_fat * entry.multiplier);
            const cal = Math.round(
              (entry.food_protein * 4 +
                entry.food_carbs * 4 +
                entry.food_fat * 9) *
                entry.multiplier
            );
            return (
              <div key={entry.id} className={styles.todayFood}>
                <div className={styles.todayFoodInfo}>
                  <div className={styles.todayFoodName}>
                    {entry.food_name}
                    <span className={styles.todayFoodPortion}>
                      {" "}
                      · {entry.food_portion_size}
                    </span>
                    {entry.multiplier !== 1 && (
                      <span className={styles.todayFoodMult}>
                        {" "}
                        × {entry.multiplier}
                      </span>
                    )}
                  </div>
                  <div className={styles.todayFoodMacros}>
                    P {p}g · C {c}g · F {f}g · {cal} cal
                    {entry.created_at && (
                      <span className={styles.todayFoodTime}>
                        {" "}
                        · {formatEntryTime(entry.created_at)}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.todayFoodControls}>
                  <div className={styles.multiplierControls}>
                    <button
                      type="button"
                      className={styles.multiplierButton}
                      aria-label="Decrease portion"
                      onClick={() =>
                        onUpdateMultiplier(
                          entry.id,
                          Math.max(0.25, entry.multiplier - 0.25)
                        )
                      }
                    >
                      <Icon.Minus size={18} />
                    </button>
                    <span className={styles.multiplierValue}>
                      {entry.multiplier}
                    </span>
                    <button
                      type="button"
                      className={styles.multiplierButton}
                      aria-label="Increase portion"
                      onClick={() =>
                        onUpdateMultiplier(entry.id, entry.multiplier + 0.25)
                      }
                    >
                      <Icon.Plus size={18} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label="Remove"
                  onClick={() => onRemoveEntry(entry.id)}
                >
                  <Icon.Trash size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.foodSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Food Database</h2>
          <span className={styles.sectionCount}>{foods.length}</span>
        </div>
        <SearchOverlay
          open={searchActive}
          onOpen={() => setSearchActive(true)}
          onClose={() => setSearchActive(false)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search foods"
          countLabel={
            searchTerm
              ? `${filteredFoods.length} match${
                  filteredFoods.length !== 1 ? "es" : ""
                }`
              : `${foods.length} foods`
          }
        >
          <button
            type="button"
            className={styles.addNewRow}
            onClick={() => {
              const seed = searchTerm.trim();
              setSearchActive(false);
              setSearchTerm("");
              onAddNewFood(seed);
            }}
          >
            <span className={styles.addNewRowIcon}>
              <Icon.Plus size={20} />
            </span>
            <span className={styles.addNewRowLabel}>
              {searchTerm.trim()
                ? `Add “${searchTerm.trim()}” as new food`
                : "Add new food"}
            </span>
          </button>
          {filteredFoods.length > 0 ? (
            <div className={styles.foodGrid}>
              {filteredFoods.map((food) => (
                <FoodTile
                  key={food.id}
                  food={food}
                  onAdd={onAddFood}
                  onEdit={(f) => {
                    setSearchActive(false);
                    setSearchTerm("");
                    onEditFood(f);
                  }}
                  onDelete={(f) => {
                    setSearchActive(false);
                    setSearchTerm("");
                    onDeleteFood(f);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              <p>No foods match "{searchTerm}"</p>
            </div>
          )}
        </SearchOverlay>
        {!searchActive && (
          <div className={styles.foodGrid}>
            {foods.map((food) => (
              <FoodTile
                key={food.id}
                food={food}
                onAdd={onAddFood}
                onEdit={onEditFood}
                onDelete={onDeleteFood}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ----- History view ---------------------------------------------------

interface HistoryEntry extends DailyEntry {
  food_entries: FoodEntry[];
  macros: MacroTotals;
}

interface HistoryViewProps {
  entries: HistoryEntry[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  settings: UserSettings | null;
  onLoadMore: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  entries,
  total,
  loading,
  loadingMore,
  settings,
  onLoadMore,
}) => {
  if (loading) {
    return (
      <div className={styles.historyContainer}>
        <h2 className={styles.sectionTitle}>History</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.historyEntry}>
            <SkeletonLine width="60%" height="1.1rem" />
            <div style={{ height: "0.5rem" }} />
            <SkeletonLine width="40%" height="0.9rem" />
            <div style={{ height: "1rem" }} />
            <SkeletonLine width="100%" height="3rem" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <h2 className={styles.sectionTitle}>History</h2>
      {entries.length === 0 ? (
        <div className={styles.noHistory}>
          <p>No history yet.</p>
          <p className={styles.noHistoryHint}>
            Log some foods on the Today tab and they'll show up here.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.historyList}>
            {entries.map((entry) => {
              const targets = getTargets(settings, entry.day_type);
              const entryDate = new Date(entry.date + "T00:00:00");
              const daysDiff = Math.floor(
                (Date.now() - entryDate.getTime()) / (24 * 60 * 60 * 1000)
              );
              const isRecent = daysDiff <= 7;
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
                        {entry.day_type === "workout" ? (
                          <>
                            <Icon.Dumbbell size={12} /> Workout
                          </>
                        ) : (
                          <>
                            <Icon.Rest size={12} /> Rest
                          </>
                        )}
                      </span>
                    </div>
                    <div className={styles.historyCalories}>
                      <span className={styles.historyCalValue}>
                        {entry.macros.calories}
                      </span>
                      <span className={styles.historyCalLabel}>cal</span>
                    </div>
                  </div>
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
                  {entry.food_entries.length > 0 && (
                    <details className={styles.historyFoods}>
                      <summary className={styles.historyFoodsSummary}>
                        {entry.food_entries.length} food
                        {entry.food_entries.length !== 1 ? "s" : ""}
                      </summary>
                      <div className={styles.historyFoodsList}>
                        {entry.food_entries.map((f) => (
                          <div key={f.id} className={styles.historyFoodItem}>
                            <span className={styles.historyFoodName}>
                              {f.food_name}
                              {f.multiplier !== 1 && ` × ${f.multiplier}`}
                            </span>
                            <span className={styles.historyFoodMacros}>
                              P{Math.round(f.food_protein * f.multiplier)} · C
                              {Math.round(f.food_carbs * f.multiplier)} · F
                              {Math.round(f.food_fat * f.multiplier)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
          {entries.length < total && (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? "Loading…"
                : `Load more (${total - entries.length} left)`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ----- Meal builder ---------------------------------------------------

interface MealFood extends Food {
  quantity: number;
}

interface MealBuilderProps {
  foods: Food[];
  mealForm: { name: string; portions: number };
  setMealForm: React.Dispatch<
    React.SetStateAction<{ name: string; portions: number }>
  >;
  mealFoods: MealFood[];
  addFoodToMeal: (food: Food) => void;
  updateMealFoodQty: (foodId: string, qty: number) => void;
  removeMealFood: (foodId: string) => void;
  onCreateMeal: () => void | Promise<void>;
  onAddNewFood: (initialName?: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}

const MealBuilderView: React.FC<MealBuilderProps> = ({
  foods,
  mealForm,
  setMealForm,
  mealFoods,
  addFoodToMeal,
  updateMealFoodQty,
  removeMealFood,
  onCreateMeal,
  onAddNewFood,
  searchTerm,
  setSearchTerm,
}) => {
  const [searchActive, setSearchActive] = useState(false);
  const filtered = useMemo(
    () =>
      foods.filter((f) =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [foods, searchTerm]
  );

  const totals = mealFoods.reduce(
    (t, f) => ({
      protein: t.protein + f.protein * f.quantity,
      carbs: t.carbs + f.carbs * f.quantity,
      fat: t.fat + f.fat * f.quantity,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  const perPortion = (v: number) =>
    Math.round((v / Math.max(1, mealForm.portions)) * 10) / 10;

  return (
    <div className={styles.mealBuilderContainer}>
      <h2 className={styles.sectionTitle}>Build a Meal</h2>
      <div className={styles.mealForm}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Meal Name</label>
            <input
              type="text"
              className={styles.formInput}
              value={mealForm.name}
              onChange={(e) =>
                setMealForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Protein smoothie"
              autoComplete="off"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Portions</label>
            <input
              type="number"
              inputMode="numeric"
              className={styles.formInput}
              value={mealForm.portions}
              onChange={(e) =>
                setMealForm((f) => ({
                  ...f,
                  portions: Math.max(1, Number(e.target.value) || 1),
                }))
              }
              min="1"
            />
          </div>
        </div>
      </div>

      {mealFoods.length > 0 && (
        <div className={styles.currentMeal}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Ingredients ({mealFoods.length})
            </h3>
          </div>
          {mealFoods.map((food) => (
            <div key={food.id} className={styles.todayFood}>
              <div className={styles.todayFoodInfo}>
                <div className={styles.todayFoodName}>{food.name}</div>
                <div className={styles.todayFoodMacros}>
                  P {Math.round(food.protein * food.quantity)}g · C{" "}
                  {Math.round(food.carbs * food.quantity)}g · F{" "}
                  {Math.round(food.fat * food.quantity)}g
                </div>
              </div>
              <div className={styles.todayFoodControls}>
                <div className={styles.multiplierControls}>
                  <button
                    type="button"
                    className={styles.multiplierButton}
                    aria-label="Decrease"
                    onClick={() =>
                      updateMealFoodQty(food.id, food.quantity - 1)
                    }
                  >
                    <Icon.Minus size={18} />
                  </button>
                  <span className={styles.multiplierValue}>
                    {food.quantity}
                  </span>
                  <button
                    type="button"
                    className={styles.multiplierButton}
                    aria-label="Increase"
                    onClick={() =>
                      updateMealFoodQty(food.id, food.quantity + 1)
                    }
                  >
                    <Icon.Plus size={18} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                className={styles.removeButton}
                aria-label="Remove"
                onClick={() => removeMealFood(food.id)}
              >
                <Icon.Trash size={18} />
              </button>
            </div>
          ))}
          <div className={styles.mealTotals}>
            <div className={styles.mealTotalsTitle}>
              Per portion (of {mealForm.portions})
            </div>
            <div className={styles.mealTotalsMacros}>
              <span>P {perPortion(totals.protein)}g</span>
              <span>C {perPortion(totals.carbs)}g</span>
              <span>F {perPortion(totals.fat)}g</span>
              <span>
                {Math.round(
                  perPortion(
                    totals.protein * 4 + totals.carbs * 4 + totals.fat * 9
                  )
                )}{" "}
                cal
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.createMealButton}
            onClick={onCreateMeal}
            disabled={!mealForm.name.trim()}
          >
            Save as Food
          </button>
        </div>
      )}

      <div className={styles.foodSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Add Ingredients</h3>
        </div>
        <SearchOverlay
          open={searchActive}
          onOpen={() => setSearchActive(true)}
          onClose={() => setSearchActive(false)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search foods to add"
          countLabel={
            searchTerm
              ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""}`
              : `${foods.length} foods`
          }
        >
          <button
            type="button"
            className={styles.addNewRow}
            onClick={() => {
              const seed = searchTerm.trim();
              setSearchActive(false);
              setSearchTerm("");
              onAddNewFood(seed);
            }}
          >
            <span className={styles.addNewRowIcon}>
              <Icon.Plus size={20} />
            </span>
            <span className={styles.addNewRowLabel}>
              {searchTerm.trim()
                ? `Add “${searchTerm.trim()}” as new food`
                : "Add new food"}
            </span>
          </button>
          {filtered.length > 0 ? (
            <div className={styles.foodGrid}>
              {filtered.map((food) => (
                <MealFoodTile
                  key={food.id}
                  food={food}
                  onAdd={addFoodToMeal}
                />
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              <p>No foods match "{searchTerm}"</p>
            </div>
          )}
        </SearchOverlay>
        {!searchActive && (
          <div className={styles.foodGrid}>
            {foods.map((food) => (
              <MealFoodTile
                key={food.id}
                food={food}
                onAdd={addFoodToMeal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MealFoodTile: React.FC<{ food: Food; onAdd: (f: Food) => void }> = ({
  food,
  onAdd,
}) => (
  <div className={styles.foodTile}>
    <button
      type="button"
      className={styles.foodTileMain}
      onClick={() => onAdd(food)}
    >
      <div className={styles.foodTileTop}>
        <span className={styles.foodName}>{food.name}</span>
        {food.frequency > 0 && (
          <span className={styles.frequency}>{food.frequency}×</span>
        )}
      </div>
      <div className={styles.foodInfo}>
        <span className={styles.portionSize}>{food.portion_size}</span>
        <span className={styles.macroInfo}>
          <span>P{food.protein}</span>
          <span>C{food.carbs}</span>
          <span>F{food.fat}</span>
        </span>
      </div>
    </button>
    <div className={styles.foodActions}>
      <span className={styles.addIcon} aria-hidden="true" title="Add to meal">
        +
      </span>
    </div>
  </div>
);

// ----- Settings view --------------------------------------------------

interface SettingsViewProps {
  settings: UserSettings | null;
  onSave: (values: {
    workout_protein: number;
    workout_carbs: number;
    workout_fat: number;
    rest_protein: number;
    rest_carbs: number;
    rest_fat: number;
  }) => void | Promise<void>;
  saving: boolean;
  saved: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSave,
  saving,
  saved,
}) => {
  const [form, setForm] = useState({
    workout_protein: settings?.workout_protein ?? 180,
    workout_carbs: settings?.workout_carbs ?? 250,
    workout_fat: settings?.workout_fat ?? 80,
    rest_protein: settings?.rest_protein ?? 180,
    rest_carbs: settings?.rest_carbs ?? 150,
    rest_fat: settings?.rest_fat ?? 100,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        workout_protein: settings.workout_protein,
        workout_carbs: settings.workout_carbs,
        workout_fat: settings.workout_fat,
        rest_protein: settings.rest_protein,
        rest_carbs: settings.rest_carbs,
        rest_fat: settings.rest_fat,
      });
    }
  }, [settings]);

  const changed = settings
    ? (Object.keys(form) as (keyof typeof form)[]).some(
        (k) => form[k] !== settings[k]
      )
    : true;

  const validate = () =>
    (Object.values(form) as number[]).every((v) => Number.isFinite(v) && v > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const setN = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    setForm((f) => ({ ...f, [k]: Number.isFinite(n) ? n : 0 }));
  };

  const workoutCal =
    form.workout_protein * 4 + form.workout_carbs * 4 + form.workout_fat * 9;
  const restCal =
    form.rest_protein * 4 + form.rest_carbs * 4 + form.rest_fat * 9;

  return (
    <form onSubmit={submit} className={styles.settingsForm}>
      <div className={styles.settingsGrid}>
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardHeader}>
            <div className={styles.settingsIcon}>
              <Icon.Dumbbell size={22} />
            </div>
            <h3 className={styles.settingsCardTitle}>Workout Day</h3>
          </div>
          {(["protein", "carbs", "fat"] as const).map((k) => (
            <div key={k} className={styles.macroInputRow}>
              <label className={styles.macroInputLabel}>
                {k[0].toUpperCase() + k.slice(1)}
              </label>
              <input
                type="number"
                inputMode="numeric"
                className={styles.macroInput}
                value={form[`workout_${k}` as keyof typeof form]}
                onChange={setN(`workout_${k}` as keyof typeof form)}
                min="1"
                required
              />
              <span className={styles.macroUnit}>g</span>
            </div>
          ))}
          <div className={styles.calorieInfo}>≈ {Math.round(workoutCal)} cal</div>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.settingsCardHeader}>
            <div className={styles.settingsIcon}>
              <Icon.Rest size={22} />
            </div>
            <h3 className={styles.settingsCardTitle}>Rest Day</h3>
          </div>
          {(["protein", "carbs", "fat"] as const).map((k) => (
            <div key={k} className={styles.macroInputRow}>
              <label className={styles.macroInputLabel}>
                {k[0].toUpperCase() + k.slice(1)}
              </label>
              <input
                type="number"
                inputMode="numeric"
                className={styles.macroInput}
                value={form[`rest_${k}` as keyof typeof form]}
                onChange={setN(`rest_${k}` as keyof typeof form)}
                min="1"
                required
              />
              <span className={styles.macroUnit}>g</span>
            </div>
          ))}
          <div className={styles.calorieInfo}>≈ {Math.round(restCal)} cal</div>
        </div>
      </div>

      <div className={styles.settingsSubmitSection}>
        <button
          type="submit"
          className={`${styles.settingsSubmitButton} ${
            changed ? styles.hasChanges : ""
          }`}
          disabled={saving || !changed || !validate()}
        >
          {saving
            ? "Saving…"
            : saved
            ? "✓ Saved"
            : changed
            ? "Save changes"
            : "No changes"}
        </button>
      </div>
    </form>
  );
};

// ----- Main app --------------------------------------------------------

type TabId = "today" | "history" | "meal-builder" | "settings";

const App: React.FC = () => {
  const toast = useToast().toast;
  const confirm = useConfirm();

  const today = formatDate(new Date());

  const [currentTab, setCurrentTab] = useState<TabId>("today");
  const [viewingDate, setViewingDate] = useState<string>(today);
  const [foods, setFoods] = useState<Food[]>([]);
  const [dailyEntry, setDailyEntry] = useState<DailyEntry | null>(null);
  const [dayType, setDayType] = useState<"workout" | "rest">("workout");
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [showAddFoodSheet, setShowAddFoodSheet] = useState(false);
  const [addFoodInitialName, setAddFoodInitialName] = useState("");

  const openAddFoodSheet = (initialName = "") => {
    setAddFoodInitialName(initialName);
    setShowAddFoodSheet(true);
  };
  const closeAddFoodSheet = () => {
    setShowAddFoodSheet(false);
    setAddFoodInitialName("");
  };
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [mealForm, setMealForm] = useState({ name: "", portions: 1 });
  const [mealFoods, setMealFoods] = useState<MealFood[]>([]);
  const [mealSearchTerm, setMealSearchTerm] = useState("");

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const currentMacros = useMemo(
    () => calculateMacros(foodEntries),
    [foodEntries]
  );
  const targets = useMemo(
    () => getTargets(settings, dailyEntry?.day_type ?? dayType),
    [settings, dailyEntry, dayType]
  );

  // ---- initial data load ----
  useEffect(() => {
    (async () => {
      try {
        setInitialLoading(true);
        const [foodsData, settingsData] = await Promise.all([
          dbUtils.getFoods(),
          dbUtils.getSettings(),
        ]);
        setFoods(foodsData);
        setSettings(settingsData);
      } catch (err) {
        console.error(err);
        toast("Could not load data. Check your connection.", { kind: "error" });
      } finally {
        setInitialLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- viewing-date load ----
  const loadDay = useCallback(
    async (date: string) => {
      try {
        setLoadingDay(true);
        const entry = await dbUtils.getDailyEntry(date);
        if (entry) {
          setDailyEntry(entry);
          setDayType(entry.day_type);
          const entries = await dbUtils.getFoodEntries(entry.id);
          entries.sort((a, b) =>
            (a.created_at ?? "").localeCompare(b.created_at ?? "")
          );
          setFoodEntries(entries);
        } else {
          setDailyEntry(null);
          setFoodEntries([]);
        }
      } catch (err) {
        console.error(err);
        toast("Could not load this day.", { kind: "error" });
      } finally {
        setLoadingDay(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadDay(viewingDate);
  }, [viewingDate, loadDay]);

  // ---- history load ----
  const loadHistory = useCallback(
    async (append: boolean) => {
      try {
        if (append) setHistoryLoadingMore(true);
        else setHistoryLoading(true);
        const offset = append ? historyEntries.length : 0;
        const limit = append ? 14 : 7;
        const batch = await dbUtils.getHistoryBatch(today, limit, offset);
        const enriched: HistoryEntry[] = batch.entries.map((e) => ({
          ...e,
          macros: calculateMacros(e.food_entries),
        }));
        setHistoryEntries((prev) => (append ? [...prev, ...enriched] : enriched));
        setHistoryTotal(batch.total);
        setHistoryLoaded(true);
      } catch (err) {
        console.error(err);
        toast("Could not load history.", { kind: "error" });
      } finally {
        setHistoryLoading(false);
        setHistoryLoadingMore(false);
      }
    },
    [historyEntries.length, today, toast]
  );

  useEffect(() => {
    if (currentTab === "history" && !historyLoaded) {
      loadHistory(false);
    }
  }, [currentTab, historyLoaded, loadHistory]);

  // ---- day-type change ----
  const handleDayTypeChange = async (newDayType: "workout" | "rest") => {
    setDayType(newDayType);
    if (!dailyEntry) return;
    const prev = dailyEntry.day_type;
    setDailyEntry({ ...dailyEntry, day_type: newDayType });
    try {
      const updated = await dbUtils.updateDailyEntryType(
        dailyEntry.id,
        newDayType
      );
      setDailyEntry(updated);
    } catch (err) {
      console.error(err);
      setDailyEntry({ ...dailyEntry, day_type: prev });
      setDayType(prev);
      toast("Could not update day type.", { kind: "error" });
    }
  };

  // ---- add food to current day (optimistic) ----
  const handleAddFood = async (food: Food) => {
    let entry = dailyEntry;
    try {
      if (!entry) {
        entry = await dbUtils.createDailyEntry(viewingDate, dayType);
        setDailyEntry(entry);
      }
      const optimisticId = `tmp-${Date.now()}`;
      const optimistic: FoodEntry = {
        id: optimisticId,
        daily_entry_id: entry.id,
        food_id: food.id,
        multiplier: 1,
        food_name: food.name,
        food_portion_size: food.portion_size,
        food_protein: food.protein,
        food_carbs: food.carbs,
        food_fat: food.fat,
        created_at: new Date().toISOString(),
      };
      setFoodEntries((entries) => [...entries, optimistic]);
      // Bump frequency locally (no refetch).
      setFoods((fs) =>
        fs.map((f) =>
          f.id === food.id ? { ...f, frequency: f.frequency + 1 } : f
        )
      );

      const [created] = await Promise.all([
        dbUtils.createFoodEntry({
          daily_entry_id: entry.id,
          food_id: food.id,
          multiplier: 1,
          food_name: food.name,
          food_portion_size: food.portion_size,
          food_protein: food.protein,
          food_carbs: food.carbs,
          food_fat: food.fat,
        }),
        dbUtils.incrementFoodFrequency(food.id).catch(() => undefined),
      ]);
      setFoodEntries((entries) =>
        entries.map((e) => (e.id === optimisticId ? created : e))
      );
      toast(`Added ${food.name}`, { kind: "success" });
    } catch (err) {
      console.error(err);
      setFoodEntries((entries) => entries.filter((e) => !e.id.startsWith("tmp-")));
      setFoods((fs) =>
        fs.map((f) =>
          f.id === food.id ? { ...f, frequency: Math.max(0, f.frequency - 1) } : f
        )
      );
      toast(`Could not add ${food.name}.`, { kind: "error" });
    }
  };

  // ---- update multiplier ----
  const handleUpdateMultiplier = async (entryId: string, newMult: number) => {
    if (newMult < 0.25) return;
    const prev = foodEntries;
    setFoodEntries((entries) =>
      entries.map((e) => (e.id === entryId ? { ...e, multiplier: newMult } : e))
    );
    try {
      await dbUtils.updateFoodEntryMultiplier(entryId, newMult);
    } catch (err) {
      console.error(err);
      setFoodEntries(prev);
      toast("Could not update portion.", { kind: "error" });
    }
  };

  // ---- remove food entry (with undo) ----
  const handleRemoveEntry = async (entryId: string) => {
    const removed = foodEntries.find((e) => e.id === entryId);
    if (!removed) return;
    setFoodEntries((entries) => entries.filter((e) => e.id !== entryId));
    let undone = false;
    let undoTimer: ReturnType<typeof setTimeout> | null = null;

    const commitDelete = async () => {
      if (undone) return;
      try {
        await dbUtils.deleteFoodEntry(entryId);
      } catch (err) {
        console.error(err);
        setFoodEntries((entries) => [...entries, removed]);
        toast("Could not remove entry.", { kind: "error" });
      }
    };

    toast(`Removed ${removed.food_name}`, {
      kind: "info",
      actionLabel: "Undo",
      onAction: () => {
        undone = true;
        if (undoTimer) clearTimeout(undoTimer);
        setFoodEntries((entries) =>
          [...entries, removed].sort((a, b) =>
            (a.created_at ?? "").localeCompare(b.created_at ?? "")
          )
        );
      },
    });
    undoTimer = setTimeout(commitDelete, 5000);
  };

  // ---- add new food (from FAB or from the search overlay's "Add new" row) ----
  const handleCreateFood = async (values: {
    name: string;
    portion_size: string;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    try {
      const created = await dbUtils.createFood(values);
      setFoods((fs) => [...fs, created]);
      closeAddFoodSheet();
      toast(`Created ${created.name}`, { kind: "success" });
      // Post-create action follows the tab context: on Meal Builder the
      // new food goes straight into the current meal; otherwise it's
      // logged onto the currently viewed day.
      if (currentTab === "meal-builder") {
        addFoodToMeal(created);
      } else {
        await handleAddFood(created);
      }
    } catch (err) {
      console.error(err);
      toast("Could not create food.", { kind: "error" });
    }
  };

  // ---- edit food ----
  const handleSaveEditedFood = async (values: {
    name: string;
    portion_size: string;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    if (!editingFood) return;
    try {
      const updated = await dbUtils.updateFood(editingFood.id, values);
      setFoods((fs) => fs.map((f) => (f.id === updated.id ? updated : f)));
      setEditingFood(null);
      toast(`Updated ${updated.name}`, { kind: "success" });
    } catch (err) {
      console.error(err);
      toast("Could not save changes.", { kind: "error" });
    }
  };

  // ---- delete food (from menu) ----
  const handleDeleteFood = async (food: Food) => {
    const ok = await confirm({
      title: `Delete "${food.name}"?`,
      message:
        "This removes it from the food database. Past entries you've already logged keep their macros.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await dbUtils.deleteFood(food.id);
      setFoods((fs) => fs.filter((f) => f.id !== food.id));
      toast(`Deleted ${food.name}`, { kind: "info" });
    } catch (err) {
      console.error(err);
      toast("Could not delete.", { kind: "error" });
    }
  };

  // ---- copy previous day ----
  const handleCopyPrev = async () => {
    const source = shiftDate(viewingDate, -1);
    try {
      const result = await dbUtils.copyDayEntries(source, viewingDate, dayType);
      setDailyEntry(result.entry);
      const sorted = [...result.food_entries].sort((a, b) =>
        (a.created_at ?? "").localeCompare(b.created_at ?? "")
      );
      setFoodEntries(sorted);
      toast(
        `Copied ${result.food_entries.length} food${
          result.food_entries.length !== 1 ? "s" : ""
        } from ${formatShortDate(source)}`,
        { kind: "success" }
      );
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message ?? "";
      if (msg.includes("404")) {
        toast(`No entry logged on ${formatShortDate(source)}.`, { kind: "info" });
      } else if (msg.includes("400")) {
        toast(`Nothing to copy from ${formatShortDate(source)}.`, {
          kind: "info",
        });
      } else {
        toast("Could not copy.", { kind: "error" });
      }
    }
  };

  // ---- settings save ----
  const handleSettingsSave = async (values: {
    workout_protein: number;
    workout_carbs: number;
    workout_fat: number;
    rest_protein: number;
    rest_carbs: number;
    rest_fat: number;
  }) => {
    try {
      setSettingsSaving(true);
      setSettingsSaved(false);
      const updated = await dbUtils.updateSettings(values);
      setSettings(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
      toast("Settings saved.", { kind: "success" });
    } catch (err) {
      console.error(err);
      toast("Could not save settings.", { kind: "error" });
    } finally {
      setSettingsSaving(false);
    }
  };

  // ---- meal builder ----
  const addFoodToMeal = (food: Food) => {
    setMealFoods((fs) => {
      const existing = fs.find((f) => f.id === food.id);
      if (existing) {
        return fs.map((f) =>
          f.id === food.id ? { ...f, quantity: f.quantity + 1 } : f
        );
      }
      return [...fs, { ...food, quantity: 1 }];
    });
  };
  const updateMealFoodQty = (foodId: string, qty: number) => {
    if (qty <= 0) {
      setMealFoods((fs) => fs.filter((f) => f.id !== foodId));
    } else {
      setMealFoods((fs) =>
        fs.map((f) => (f.id === foodId ? { ...f, quantity: qty } : f))
      );
    }
  };
  const removeMealFood = (foodId: string) => {
    setMealFoods((fs) => fs.filter((f) => f.id !== foodId));
  };
  const handleCreateMeal = async () => {
    if (!mealForm.name.trim() || mealFoods.length === 0) return;
    const totals = mealFoods.reduce(
      (t, f) => ({
        protein: t.protein + f.protein * f.quantity,
        carbs: t.carbs + f.carbs * f.quantity,
        fat: t.fat + f.fat * f.quantity,
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    const portions = Math.max(1, mealForm.portions);
    try {
      const created = await dbUtils.createFood({
        name: mealForm.name.trim(),
        portion_size: "1 portion",
        protein: Math.round((totals.protein / portions) * 10) / 10,
        carbs: Math.round((totals.carbs / portions) * 10) / 10,
        fat: Math.round((totals.fat / portions) * 10) / 10,
      });
      setFoods((fs) => [...fs, created]);
      setMealForm({ name: "", portions: 1 });
      setMealFoods([]);
      setMealSearchTerm("");
      toast(`Saved "${created.name}" as a food.`, { kind: "success" });
    } catch (err) {
      console.error(err);
      toast("Could not save meal.", { kind: "error" });
    }
  };

  // ---- render ----
  if (initialLoading) {
    return (
      <div className={styles.app}>
        <header className={styles.header}>
          <h1 className={styles.title}>Macro Tracker</h1>
        </header>
        <main className={styles.main}>
          <TodaySkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Macro Tracker</h1>
      </header>

      <main className={styles.main}>
        {currentTab === "today" && (
          <TodayView
            viewingDate={viewingDate}
            today={today}
            setViewingDate={setViewingDate}
            dailyEntry={dailyEntry}
            dayType={dayType}
            onDayTypeChange={handleDayTypeChange}
            foodEntries={foodEntries}
            currentMacros={currentMacros}
            targets={targets}
            foods={foods}
            onAddFood={handleAddFood}
            onEditFood={setEditingFood}
            onDeleteFood={handleDeleteFood}
            onUpdateMultiplier={handleUpdateMultiplier}
            onRemoveEntry={handleRemoveEntry}
            onCopyYesterday={handleCopyPrev}
            onAddNewFood={openAddFoodSheet}
            loadingDay={loadingDay}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
        {currentTab === "history" && (
          <HistoryView
            entries={historyEntries}
            total={historyTotal}
            loading={historyLoading}
            loadingMore={historyLoadingMore}
            settings={settings}
            onLoadMore={() => loadHistory(true)}
          />
        )}
        {currentTab === "meal-builder" && (
          <MealBuilderView
            foods={foods}
            mealForm={mealForm}
            setMealForm={setMealForm}
            mealFoods={mealFoods}
            addFoodToMeal={addFoodToMeal}
            updateMealFoodQty={updateMealFoodQty}
            removeMealFood={removeMealFood}
            onCreateMeal={handleCreateMeal}
            onAddNewFood={openAddFoodSheet}
            searchTerm={mealSearchTerm}
            setSearchTerm={setMealSearchTerm}
          />
        )}
        {currentTab === "settings" && (
          <SettingsView
            settings={settings}
            onSave={handleSettingsSave}
            saving={settingsSaving}
            saved={settingsSaved}
          />
        )}
      </main>

      {(currentTab === "today" || currentTab === "meal-builder") && (
        <button
          type="button"
          className={styles.fab}
          onClick={() => openAddFoodSheet()}
          aria-label="Add new food"
        >
          <Icon.Plus size={26} />
        </button>
      )}

      <nav className={styles.bottomNav} aria-label="Sections">
        {(
          [
            { id: "today", label: "Today", icon: Icon.Today },
            { id: "history", label: "History", icon: Icon.History },
            { id: "meal-builder", label: "Meals", icon: Icon.Meal },
            { id: "settings", label: "Settings", icon: Icon.Settings },
          ] as { id: TabId; label: string; icon: React.FC<{ size?: number }> }[]
        ).map(({ id, label, icon: I }) => (
          <button
            key={id}
            type="button"
            className={`${styles.bottomNavItem} ${
              currentTab === id ? styles.bottomNavActive : ""
            }`}
            onClick={() => setCurrentTab(id)}
            aria-current={currentTab === id ? "page" : undefined}
          >
            <I size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <Sheet
        open={showAddFoodSheet}
        onClose={closeAddFoodSheet}
        title="Add New Food"
      >
        <FoodForm
          initial={{
            name: addFoodInitialName,
            portion_size: "",
            protein: "",
            carbs: "",
            fat: "",
          }}
          submitLabel="Add"
          onSubmit={handleCreateFood}
        />
      </Sheet>

      <Sheet
        open={editingFood !== null}
        onClose={() => setEditingFood(null)}
        title="Edit Food"
      >
        {editingFood && (
          <FoodForm
            initial={{
              name: editingFood.name,
              portion_size: editingFood.portion_size,
              protein: editingFood.protein,
              carbs: editingFood.carbs,
              fat: editingFood.fat,
            }}
            submitLabel="Save"
            onSubmit={handleSaveEditedFood}
          />
        )}
      </Sheet>
    </div>
  );
};

export default App;
