// src/components/Header/Header.tsx

import React from 'react'
import styles from './Header.module.css'
import type { DayType } from '../../types'

interface HeaderProps {
  dayType: DayType
  onDayTypeChange: (dayType: DayType) => void
}

export const Header: React.FC<HeaderProps> = ({ dayType, onDayTypeChange }) => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>MacroTracker</h1>
          <p className={styles.subtitle}>Track your daily nutrition goals</p>
        </div>
        
        <div className={styles.dayTypeToggle}>
          <button
            className={`${styles.toggleButton} ${dayType === 'workout' ? styles.active : ''}`}
            onClick={() => onDayTypeChange('workout')}
          >
            💪 Workout Day
          </button>
          <button
            className={`${styles.toggleButton} ${dayType === 'rest' ? styles.active : ''}`}
            onClick={() => onDayTypeChange('rest')}
          >
            🧘 Rest Day
          </button>
        </div>
      </div>
    </header>
  )
}