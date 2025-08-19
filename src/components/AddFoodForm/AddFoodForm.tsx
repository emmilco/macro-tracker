// src/components/AddFoodForm/AddFoodForm.tsx

import React, { useState } from 'react'
import styles from './AddFoodForm.module.css'
import type { AddFoodFormData } from '../../types'
import { calculateCalories } from '../../services/database'

interface AddFoodFormProps {
  onSubmit: (data: AddFoodFormData) => void
  onCancel: () => void
  initialData?: AddFoodFormData
  isEditing?: boolean
}

export const AddFoodForm: React.FC<AddFoodFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData,
  isEditing = false 
}) => {
  const [formData, setFormData] = useState<AddFoodFormData>(
    initialData || {
      name: '',
      portion_size: '',
      protein: 0,
      carbs: 0,
      fat: 0
    }
  )

  const [errors, setErrors] = useState<Partial<AddFoodFormData>>({})

  const handleInputChange = (field: keyof AddFoodFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<AddFoodFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Food name is required'
    }

    if (!formData.portion_size.trim()) {
      newErrors.portion_size = 'Portion size is required'
    }

    if (formData.protein < 0) {
      newErrors.protein = 'Protein cannot be negative'
    }

    if (formData.carbs < 0) {
      newErrors.carbs = 'Carbs cannot be negative'
    }

    if (formData.fat < 0) {
      newErrors.fat = 'Fat cannot be negative'
    }

    if (formData.protein === 0 && formData.carbs === 0 && formData.fat === 0) {
      newErrors.protein = 'At least one macro must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const calculatedCalories = calculateCalories(formData.protein, formData.carbs, formData.fat)

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h3>{isEditing ? 'Edit Food' : 'Add New Food'}</h3>
          <button className={styles.closeButton} onClick={onCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="name">Food Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Chicken Breast"
                className={errors.name ? styles.inputError : ''}
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="portion_size">Portion Size *</label>
              <input
                id="portion_size"
                type="text"
                value={formData.portion_size}
                onChange={(e) => handleInputChange('portion_size', e.target.value)}
                placeholder="e.g., 6oz cooked"
                className={errors.portion_size ? styles.inputError : ''}
              />
              {errors.portion_size && <span className={styles.errorText}>{errors.portion_size}</span>}
            </div>

            <div className={styles.macroSection}>
              <h4>Macronutrients per serving</h4>
              <div className={styles.macroGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="protein">
                    <span className={styles.proteinLabel}>Protein (g) *</span>
                  </label>
                  <input
                    id="protein"
                    type="number"
                    value={formData.protein}
                    onChange={(e) => handleInputChange('protein', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className={errors.protein ? styles.inputError : ''}
                  />
                  {errors.protein && <span className={styles.errorText}>{errors.protein}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="carbs">
                    <span className={styles.carbsLabel}>Carbs (g) *</span>
                  </label>
                  <input
                    id="carbs"
                    type="number"
                    value={formData.carbs}
                    onChange={(e) => handleInputChange('carbs', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className={errors.carbs ? styles.inputError : ''}
                  />
                  {errors.carbs && <span className={styles.errorText}>{errors.carbs}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fat">
                    <span className={styles.fatLabel}>Fat (g) *</span>
                  </label>
                  <input
                    id="fat"
                    type="number"
                    value={formData.fat}
                    onChange={(e) => handleInputChange('fat', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className={errors.fat ? styles.inputError : ''}
                  />
                  {errors.fat && <span className={styles.errorText}>{errors.fat}</span>}
                </div>
              </div>
            </div>

            <div className={styles.caloriePreview}>
              <div className={styles.calorieInfo}>
                <span className={styles.calorieLabel}>Estimated Calories:</span>
                <span className={styles.calorieValue}>{Math.round(calculatedCalories)}</span>
              </div>
              <div className={styles.macroBreakdown}>
                <span>P: {formData.protein}g (4 cal/g)</span>
                <span>C: {formData.carbs}g (4 cal/g)</span>
                <span>F: {formData.fat}g (9 cal/g)</span>
              </div>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button 
              type="button" 
              onClick={onCancel}
              className="button-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={styles.submitButton}
            >
              {isEditing ? 'Update Food' : 'Add Food'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}