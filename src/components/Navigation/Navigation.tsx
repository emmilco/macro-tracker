// src/components/Navigation/Navigation.tsx

import React from 'react'
import styles from './Navigation.module.css'
import type { Tab } from '../../types'

interface NavigationProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'today' as Tab, label: 'Today', icon: '📊' },
    { id: 'history' as Tab, label: 'History', icon: '📅' },
    { id: 'settings' as Tab, label: 'Settings', icon: '⚙️' }
  ]

  return (
    <nav className={styles.navigation}>
      <div className={styles.container}>
        <div className={styles.tabList}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className={styles.icon}>{tab.icon}</span>
              <span className={styles.label}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}