-- =====================================================
-- ADD AUTHENTICATION TO MACRO TRACKER
-- =====================================================
-- This script adds user authentication and data isolation
-- Run this in your Supabase SQL Editor after the main schema
-- =====================================================

-- Step 1: Add user_id columns to all tables
-- =====================================================

-- Add user_id to foods table
ALTER TABLE foods ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to daily_entries table
ALTER TABLE daily_entries ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to user_settings table
ALTER TABLE user_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: food_entries inherits user isolation through daily_entries relationship

-- Step 2: Create indexes for performance
-- =====================================================

CREATE INDEX idx_foods_user_id ON foods(user_id);
CREATE INDEX idx_daily_entries_user_id ON daily_entries(user_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Step 3: Update Row Level Security policies
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow all operations" ON foods;
DROP POLICY IF EXISTS "Allow all operations" ON daily_entries;
DROP POLICY IF EXISTS "Allow all operations" ON food_entries;
DROP POLICY IF EXISTS "Allow all operations" ON user_settings;

-- Foods policies
CREATE POLICY "Users can view own foods" ON foods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own foods" ON foods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foods" ON foods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foods" ON foods
  FOR DELETE USING (auth.uid() = user_id);

-- Daily entries policies
CREATE POLICY "Users can view own daily entries" ON daily_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily entries" ON daily_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily entries" ON daily_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily entries" ON daily_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Food entries policies (inherits through daily_entries)
CREATE POLICY "Users can view own food entries" ON food_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_entries 
      WHERE daily_entries.id = food_entries.daily_entry_id 
      AND daily_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own food entries" ON food_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_entries 
      WHERE daily_entries.id = food_entries.daily_entry_id 
      AND daily_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own food entries" ON food_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM daily_entries 
      WHERE daily_entries.id = food_entries.daily_entry_id 
      AND daily_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own food entries" ON food_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM daily_entries 
      WHERE daily_entries.id = food_entries.daily_entry_id 
      AND daily_entries.user_id = auth.uid()
    )
  );

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Step 4: Update the increment function to be user-aware
-- =====================================================

CREATE OR REPLACE FUNCTION increment_food_frequency(food_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE foods
  SET frequency = frequency + 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = food_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to populate default foods for new users
-- =====================================================

CREATE OR REPLACE FUNCTION populate_default_foods_for_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO foods (user_id, name, portion_size, protein, carbs, fat, frequency) VALUES
    (target_user_id, '8oz Ground Beef (93/7)', '8 oz serving', 48.0, 0.0, 16.0, 0),
    (target_user_id, '1 cup Jasmine Rice', '1 cup cooked', 8.0, 52.0, 1.0, 0),
    (target_user_id, '1 Large Banana', '1 large (126g)', 1.0, 27.0, 0.0, 0),
    (target_user_id, '2 Whole Eggs', '2 large eggs', 12.0, 1.0, 10.0, 0),
    (target_user_id, '1 cup Broccoli', '1 cup chopped', 3.0, 6.0, 0.0, 0),
    (target_user_id, '1 tbsp Olive Oil', '1 tablespoon', 0.0, 0.0, 14.0, 0),
    (target_user_id, 'Chicken Thigh', '180g cooked', 45.0, 0.0, 14.0, 0),
    (target_user_id, 'Chicken Breast', '180g cooked', 58.0, 0.0, 6.0, 0),
    (target_user_id, 'Shrimp', '6oz', 28.0, 0.0, 0.0, 0),
    (target_user_id, 'Tilapia', '4oz', 23.0, 0.0, 2.0, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to set up default settings for new users
-- =====================================================

CREATE OR REPLACE FUNCTION setup_new_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Create default settings
  INSERT INTO user_settings (
    user_id,
    workout_protein, workout_carbs, workout_fat,
    rest_protein, rest_carbs, rest_fat
  ) VALUES (
    target_user_id,
    180, 250, 80,  -- Workout day targets
    180, 150, 100  -- Rest day targets
  );
  
  -- Populate default foods
  PERFORM populate_default_foods_for_user(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Your database now supports multi-user authentication.
-- 
-- Next steps:
-- 1. Configure Google OAuth in Supabase Dashboard
-- 2. Update your React app with auth logic
-- 3. Test login/logout functionality
-- 
-- Note: Existing data will need user_id values assigned
-- or can be cleared for a fresh start.
-- =====================================================