// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database initialization and seeding functions
export const initializeDatabase = async () => {
  try {
    // Check if tables exist by trying to fetch from them
    await supabase.from('user_settings').select('*').limit(1)
    await supabase.from('foods').select('*').limit(1)
    await supabase.from('daily_entries').select('*').limit(1)
    await supabase.from('food_entries').select('*').limit(1)
    
    console.log('Database tables exist')
    return true
  } catch (error) {
    console.error('Database tables may not exist:', error)
    return false
  }
}

export const seedDefaultData = async () => {
  try {
    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)

    if (existingSettings && existingSettings.length === 0) {
      // Insert default settings
      await supabase.from('user_settings').insert({
        workout_protein: 180,
        workout_carbs: 250,
        workout_fat: 80,
        rest_protein: 180,
        rest_carbs: 150,
        rest_fat: 100
      })
    }

    // Check if foods already exist
    const { data: existingFoods } = await supabase
      .from('foods')
      .select('*')
      .limit(1)

    if (existingFoods && existingFoods.length === 0) {
      // Insert default foods
      const defaultFoods = [
        { name: '8oz Ground Beef (93/7)', portion_size: '8 oz serving', protein: 48, carbs: 0, fat: 16, frequency: 0 },
        { name: '1 cup Jasmine Rice', portion_size: '1 cup cooked', protein: 8, carbs: 52, fat: 1, frequency: 0 },
        { name: '1 Large Banana', portion_size: '1 large (126g)', protein: 1, carbs: 27, fat: 0, frequency: 0 },
        { name: '2 Whole Eggs', portion_size: '2 large eggs', protein: 12, carbs: 1, fat: 10, frequency: 0 },
        { name: '1 cup Broccoli', portion_size: '1 cup chopped', protein: 3, carbs: 6, fat: 0, frequency: 0 },
        { name: '1 tbsp Olive Oil', portion_size: '1 tablespoon', protein: 0, carbs: 0, fat: 14, frequency: 0 },
        { name: 'Chicken Thigh', portion_size: '180g cooked', protein: 45, carbs: 0, fat: 14, frequency: 0 },
        { name: 'Chicken Breast', portion_size: '180g cooked', protein: 58, carbs: 0, fat: 6, frequency: 0 },
        { name: 'Shrimp', portion_size: '6oz', protein: 28, carbs: 0, fat: 0, frequency: 0 },
        { name: 'Tilapia', portion_size: '4oz', protein: 23, carbs: 0, fat: 2, frequency: 0 }
      ]

      await supabase.from('foods').insert(defaultFoods)
    }

    console.log('Default data seeded successfully')
    return true
  } catch (error) {
    console.error('Error seeding default data:', error)
    return false
  }
}