// src/components/History/History.tsx

import React, { useState, useEffect } from 'react'
import styles from './History.module.css'
import type { DailyEntry, FoodEntry, MacroTotals } from '../../types'
import { supabase } from '../../lib/supabase'
import { calculateCalories } from '../../services/database'

interface HistoryEntry extends DailyEntry {
  food_entries: FoodEntry[]
  totals: MacroTotals
}

export const History: React.FC = () => {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      
      // Get all daily entries with their food entries
      const { data: dailyEntries, error: dailyError } = await supabase
        .from('daily_entries')
        .select(`
          *,
          food_entries (*)
        `)
        .order('date', { ascending: false })
        .limit(30) // Last 30 days

      if (dailyError) throw dailyError

      // Calculate totals for each day
      const entriesWithTotals: HistoryEntry[] = (dailyEntries || []).map(entry => {
        const totals = entry.food_entries.reduce(
          (acc: MacroTotals, foodEntry: FoodEntry) => ({
            protein: acc.protein + (foodEntry.food_protein * foodEntry.multiplier),
            carbs: acc.carbs + (foodEntry.food_carbs * foodEntry.multiplier),
            fat: acc.fat + (foodEntry.food_fat * foodEntry.multiplier),
            calories: 0 // Will be calculated below
          }),
          { protein: 0, carbs: 0, fat: 0, calories: 0 }
        )

        totals.calories = calculateCalories(totals.protein, totals.carbs, totals.fat)

        return {
          ...entry,
          totals
        }
      })

      setHistoryEntries(entriesWithTotals)
    } catch (err) {
      console.error('Failed to load history:', err)
      setError('Failed to load history data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) return 'Today'
    if (isYesterday) return 'Yesterday'

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDayTypeIcon = (dayType: string): string => {
    return dayType === 'workout' ? '💪' : '🧘'
  }

  const getDayTypeLabel = (dayType: string): string => {
    return dayType === 'workout' ? 'Workout Day' : 'Rest Day'
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={loadHistory}>Try Again</button>
      </div>
    )
  }

  if (historyEntries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📅</div>
        <h3>No History Yet</h3>
        <p>Start tracking your food intake to see your nutrition history here.</p>
      </div>
    )
  }

  return (
    <div className={styles.history}>
      <div className={styles.header}>
        <h2>Nutrition History</h2>
        <p>Your past {historyEntries.length} day{historyEntries.length !== 1 ? 's' : ''} of tracking</p>
      </div>

      <div className={styles.historyList}>
        {historyEntries.map((entry) => (
          <div key={entry.id} className={styles.historyCard}>
            <div className={styles.cardHeader}>
              <div className={styles.dateSection}>
                <h3>{formatDate(entry.date)}</h3>
                <div className={styles.dayType}>
                  <span className={styles.dayTypeIcon}>{getDayTypeIcon(entry.day_type)}</span>
                  <span className={styles.dayTypeLabel}>{getDayTypeLabel(entry.day_type)}</span>
                </div>
              </div>
              <div className={styles.totalCalories}>
                <span className={styles.calorieValue}>{Math.round(entry.totals.calories)}</span>
                <span className={styles.calorieLabel}>calories</span>
              </div>
            </div>

            <div className={styles.macroSummary}>
              <div className={styles.macroItem}>
                <span className={styles.macroLabel}>Protein</span>
                <span className={`${styles.macroValue} ${styles.protein}`}>
                  {Math.round(entry.totals.protein)}g
                </span>
              </div>
              <div className={styles.macroItem}>
                <span className={styles.macroLabel}>Carbs</span>
                <span className={`${styles.macroValue} ${styles.carbs}`}>
                  {Math.round(entry.totals.carbs)}g
                </span>
              </div>
              <div className={styles.macroItem}>
                <span className={styles.macroLabel}>Fat</span>
                <span className={`${styles.macroValue} ${styles.fat}`}>
                  {Math.round(entry.totals.fat)}g
                </span>
              </div>
            </div>

            {entry.food_entries.length > 0 && (
              <div className={styles.foodList}>
                <h4>Foods consumed:</h4>
                <div className={styles.foods}>
                  {entry.food_entries.map((foodEntry) => (
                    <div key={foodEntry.id} className={styles.foodItem}>
                      <span className={styles.foodName}>
                        {foodEntry.food_name}
                        {foodEntry.multiplier !== 1 && (
                          <span className={styles.multiplier}> × {foodEntry.multiplier}</span>
                        )}
                      </span>
                      <span className={styles.foodPortion}>{foodEntry.food_portion_size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}