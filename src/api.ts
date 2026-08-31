import type {
  Food,
  DailyEntry,
  FoodEntry,
  UserSettings,
  HistoryBatch,
  CopyDayResult,
} from "./types";

// All requests are same-origin to the FastAPI backend that serves this
// React app. Auth is handled by Cloudflare Access at the edge — there is
// no per-user data partitioning on the backend.

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init?.method || "GET"} ${path} -> ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const dbUtils = {
  // Foods
  async getFoods(): Promise<Food[]> {
    return request<Food[]>("/api/foods");
  },

  async createFood(food: Omit<Food, "id" | "frequency">): Promise<Food> {
    return request<Food>("/api/foods", {
      method: "POST",
      body: JSON.stringify(food),
    });
  },

  async updateFood(id: string, updates: Partial<Food>): Promise<Food> {
    return request<Food>(`/api/foods/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async deleteFood(id: string): Promise<void> {
    await request<void>(`/api/foods/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async incrementFoodFrequency(id: string): Promise<void> {
    await request<void>(
      `/api/foods/${encodeURIComponent(id)}/increment-frequency`,
      { method: "POST" }
    );
  },

  // Daily entries
  async getDailyEntry(date: string): Promise<DailyEntry | null> {
    return request<DailyEntry | null>(
      `/api/daily-entries/by-date/${encodeURIComponent(date)}`
    );
  },

  async createDailyEntry(
    date: string,
    dayType: "workout" | "rest"
  ): Promise<DailyEntry> {
    return request<DailyEntry>("/api/daily-entries", {
      method: "POST",
      body: JSON.stringify({ date, day_type: dayType }),
    });
  },

  async updateDailyEntryType(
    id: string,
    dayType: "workout" | "rest"
  ): Promise<DailyEntry> {
    return request<DailyEntry>(`/api/daily-entries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ day_type: dayType }),
    });
  },

  // Food entries
  async getFoodEntries(dailyEntryId: string): Promise<FoodEntry[]> {
    const params = new URLSearchParams({ daily_entry_id: dailyEntryId });
    return request<FoodEntry[]>(`/api/food-entries?${params}`);
  },

  async createFoodEntry(foodEntry: Omit<FoodEntry, "id">): Promise<FoodEntry> {
    return request<FoodEntry>("/api/food-entries", {
      method: "POST",
      body: JSON.stringify(foodEntry),
    });
  },

  async updateFoodEntryMultiplier(
    id: string,
    multiplier: number
  ): Promise<FoodEntry> {
    return request<FoodEntry>(`/api/food-entries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ multiplier }),
    });
  },

  async deleteFoodEntry(id: string): Promise<void> {
    await request<void>(`/api/food-entries/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async getHistoricalDailyEntries(excludeDate: string): Promise<DailyEntry[]> {
    const params = new URLSearchParams({ exclude: excludeDate });
    return request<DailyEntry[]>(`/api/daily-entries/historical?${params}`);
  },

  async getHistoryBatch(
    excludeDate: string,
    limit = 30,
    offset = 0
  ): Promise<HistoryBatch> {
    const params = new URLSearchParams({
      exclude: excludeDate,
      limit: String(limit),
      offset: String(offset),
    });
    return request<HistoryBatch>(`/api/history?${params}`);
  },

  async copyDayEntries(
    sourceDate: string,
    targetDate: string,
    dayType: "workout" | "rest"
  ): Promise<CopyDayResult> {
    return request<CopyDayResult>("/api/daily-entries/copy", {
      method: "POST",
      body: JSON.stringify({
        source_date: sourceDate,
        target_date: targetDate,
        day_type: dayType,
      }),
    });
  },

  // Settings
  async getSettings(): Promise<UserSettings | null> {
    return request<UserSettings | null>("/api/settings");
  },

  async updateSettings(
    settings: Omit<UserSettings, "id">
  ): Promise<UserSettings> {
    return request<UserSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },
};
