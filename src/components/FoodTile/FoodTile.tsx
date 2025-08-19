// src/components/FoodTile/FoodTile.tsx

import React, { useState, useRef, useEffect } from 'react'
import styles from './FoodTile.module.css'
import type { Food } from '../../types'

interface FoodTileProps {
  food: Food
  onAddFood: (food: Food, multiplier: number) => void
  onEditFood: (food: Food) => void
  onDeleteFood: (food: Food) => void
}

export const FoodTile: React.FC<FoodTileProps> = ({ 
  food, 
  onAddFood, 
  onEditFood, 
  onDeleteFood 
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [multiplier, setMultiplier] = useState(1)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTileClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddFood(food, multiplier)
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onEditFood(food)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onDeleteFood(food)
  }

  const handleMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const value = parseFloat(e.target.value) || 1
    setMultiplier(Math.max(0.1, Math.min(10, value)))
  }

  return (
    <div className={styles.foodTile} onClick={handleTileClick}>
      <div className={styles.header}>
        <div className={styles.nameSection}>
          <h3 className={styles.name}>{food.name}</h3>
          <p className={styles.portion}>{food.portion_size}</p>
        </div>
        
        <div className={styles.actions}>
          {food.frequency > 0 && (
            <span className={styles.frequency}>{food.frequency}×</span>
          )}
          <button 
            className={styles.menuButton}
            onClick={handleMenuClick}
            aria-label="Food options"
          >
            ⋯
          </button>
        </div>
      </div>

      <div className={styles.macros}>
        <span className={styles.protein}>P: {Math.round(food.protein * multiplier)}</span>
        <span className={styles.carbs}>C: {Math.round(food.carbs * multiplier)}</span>
        <span className={styles.fat}>F: {Math.round(food.fat * multiplier)}</span>
      </div>

      <div className={styles.multiplierSection}>
        <label className={styles.multiplierLabel}>×</label>
        <input
          type="number"
          value={multiplier}
          onChange={handleMultiplierChange}
          className={styles.multiplierInput}
          min="0.1"
          max="10"
          step="0.1"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {showMenu && (
        <div ref={menuRef} className={styles.menu}>
          <button className={styles.menuItem} onClick={handleEdit}>
            ✏️ Edit
          </button>
          <button className={styles.menuItem} onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  )
}