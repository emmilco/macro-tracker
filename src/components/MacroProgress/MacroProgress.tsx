// src/components/MacroProgress/MacroProgress.tsx

import React from 'react'
import styles from './MacroProgress.module.css'
import type { MacroTargets, MacroTotals } from '../../types'
import { calculateCalories } from '../../services/database'

interface MacroProgressProps {
  targets: MacroTargets
  totals: MacroTotals
}

export const MacroProgress: React.FC<MacroProgressProps> = ({ targets, totals }) => {
  const targetCalories = calculateCalories(targets.protein, targets.carbs, targets.fat)
  
  const macros = [
    {
      name: 'Protein',
      current: totals.protein,
      target: targets.protein,
      color: 'var(--protein-color)',
      unit: 'g'
    },
    {
      name: 'Carbs',
      current: totals.carbs,
      target: targets.carbs,
      color: 'var(--carbs-color)',
      unit: 'g'
    },
    {
      name: 'Fat',
      current: totals.fat,
      target: targets.fat,
      color: 'var(--fat-color)',
      unit: 'g'
    },
    {
      name: 'Calories',
      current: totals.calories,
      target: targetCalories,
      color: 'var(--primary-color)',
      unit: 'cal'
    }
  ]

  return (
    <div className={styles.macroProgress}>
      <h2 className={styles.title}>Daily Progress</h2>
      <div className={styles.macroGrid}>
        {macros.map((macro) => {
          const percentage = Math.min((macro.current / macro.target) * 100, 100)
          const isOverTarget = macro.current > macro.target
          
          return (
            <div key={macro.name} className={styles.macroCard}>
              <div className={styles.macroHeader}>
                <h3 className={styles.macroName}>{macro.name}</h3>
                <div className={styles.macroValues}>
                  <span className={styles.current}>{Math.round(macro.current)}</span>
                  <span className={styles.separator}>/</span>
                  <span className={styles.target}>{macro.target}{macro.unit}</span>
                </div>
              </div>
              
              <div className={styles.barContainer}>
                <div className={styles.barBackground}>
                  <div 
                    className={`${styles.barFill} ${isOverTarget ? styles.overTarget : ''}`}
                    style={{ 
                      height: `${percentage}%`,
                      backgroundColor: macro.color,
                      boxShadow: `0 0 10px ${macro.color}30`
                    }}
                  >
                    {isOverTarget && (
                      <div 
                        className={styles.overTargetIndicator}
                        style={{ 
                          height: `${((macro.current - macro.target) / macro.target) * 100}%`,
                          backgroundColor: `${macro.color}80`
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className={styles.percentage}>
                  {Math.round(percentage)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}