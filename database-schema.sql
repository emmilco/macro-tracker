-- Supabase Database Schema for MacroTracker
-- Run this SQL in your Supabase SQL editor to create the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create foods table
CREATE TABLE IF NOT EXISTS foods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    portion_size TEXT NOT NULL,
    protein DECIMAL(8,2) NOT NULL DEFAULT 0,
    carbs DECIMAL(8,2) NOT NULL DEFAULT 0,
    fat DECIMAL(8,2) NOT NULL DEFAULT 0,
    frequency INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create daily_entries table
CREATE TABLE IF NOT EXISTS daily_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    day_type TEXT NOT NULL CHECK (day_type IN ('workout', 'rest')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create food_entries table
CREATE TABLE IF NOT EXISTS food_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    daily_entry_id UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    multiplier DECIMAL(8,2) NOT NULL DEFAULT 1.0,
    -- Historical preservation fields
    food_name TEXT NOT NULL,
    food_portion_size TEXT NOT NULL,
    food_protein DECIMAL(8,2) NOT NULL DEFAULT 0,
    food_carbs DECIMAL(8,2) NOT NULL DEFAULT 0,
    food_fat DECIMAL(8,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workout_protein INTEGER NOT NULL DEFAULT 180,
    workout_carbs INTEGER NOT NULL DEFAULT 250,
    workout_fat INTEGER NOT NULL DEFAULT 80,
    rest_protein INTEGER NOT NULL DEFAULT 180,
    rest_carbs INTEGER NOT NULL DEFAULT 150,
    rest_fat INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create function to increment food frequency
CREATE OR REPLACE FUNCTION increment_food_frequency(food_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE foods 
    SET frequency = frequency + 1,
        updated_at = NOW()
    WHERE id = food_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_foods_updated_at 
    BEFORE UPDATE ON foods 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_foods_frequency ON foods(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(date);
CREATE INDEX IF NOT EXISTS idx_food_entries_daily_entry_id ON food_entries(daily_entry_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_food_id ON food_entries(food_id);

-- Enable Row Level Security (RLS) - optional for single-user app
-- You can uncomment these if you plan to add user authentication later

-- ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a single-user app for now)
-- Remove these and add proper user-based policies when adding authentication

CREATE POLICY "Enable all operations for foods" ON foods FOR ALL USING (true);
CREATE POLICY "Enable all operations for daily_entries" ON daily_entries FOR ALL USING (true);
CREATE POLICY "Enable all operations for food_entries" ON food_entries FOR ALL USING (true);
CREATE POLICY "Enable all operations for user_settings" ON user_settings FOR ALL USING (true);