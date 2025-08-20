-- =====================================================
-- UPDATE FOODS DATABASE WITH NEW COMPREHENSIVE LIST
-- =====================================================
-- This script will clear existing foods and replace them
-- with the provided comprehensive list.
-- 
-- Run this in your Supabase SQL Editor.
-- =====================================================

-- Step 1: Clear existing foods
-- =====================================================
DELETE FROM foods;

-- Step 2: Insert new comprehensive food list
-- =====================================================
INSERT INTO foods (name, portion_size, protein, carbs, fat, frequency) VALUES
  ('Chicken Thigh', '180g cooked', 45.0, 0.0, 14.0, 0),
  ('Chicken Breast', '180g cooked', 58.0, 0.0, 6.0, 0),
  ('Chicken Soup', '1 portion', 47.0, 6.0, 6.0, 0),
  ('Pork Stew', '1 portion', 40.0, 19.0, 25.0, 0),
  ('Meatballs', '1/27 portion', 61.0, 56.0, 12.0, 0),
  ('Beef Stew', '6/24 portion', 40.0, 16.0, 17.0, 0),
  ('Lasagna', '4/16 portion', 27.0, 20.0, 17.0, 0),
  ('Shrimp', '6oz', 28.0, 0.0, 0.0, 0),
  ('8oz Ground Beef', '8oz', 45.0, 0.0, 23.0, 0),
  ('4oz WF Tenders', '4oz', 19.0, 23.0, 16.0, 0),
  ('Tilapia', '4oz', 23.0, 0.0, 2.0, 0),
  ('Top Round Steak', '1 ounce', 6.7, 0.0, 0.7, 0),
  ('Pork Chop', '1oz', 6.3, 0.0, 1.0, 0),
  ('Salmon', '1 oz', 5.8, 0.0, 3.8, 0),
  ('Top Sirloin Steak', '1oz', 5.8, 0.0, 3.6, 0),
  ('1 Large EB Egg', '1 large egg', 6.0, 0.0, 4.0, 0),
  ('1 Large EB Egg White', '1 large egg white', 5.0, 0.0, 0.0, 0),
  ('English Muffin', '1 muffin', 5.0, 30.0, 1.0, 0),
  ('1 Cup 2% Milk', '1 cup', 8.0, 12.0, 5.0, 0),
  ('Cooked Sirloin', '100g', 27.0, 0.0, 14.0, 0),
  ('White Rice', '150g', 4.0, 40.0, 0.0, 0),
  ('1 Cup Muscle Egg Whites', '1 cup', 26.0, 5.0, 0.0, 0),
  ('Unsweetened WF Apple Sauce', '1 portion', 0.0, 19.0, 0.0, 0),
  ('1 WF Mozzarella Stick', '1 stick', 7.0, 0.0, 6.0, 0),
  ('Barely Chicken Nuggets', '3oz', 16.0, 9.0, 6.0, 0),
  ('METRx Churro Bar', '1 bar', 30.0, 40.0, 11.0, 0),
  ('METRx Bar', '1 bar', 30.0, 9.0, 10.0, 0),
  ('Pret BEC', '1 portion', 28.0, 44.0, 22.0, 0),
  ('4 Scoops REDCON MRE', '4 scoops', 47.0, 75.0, 4.0, 0),
  ('1 Scoop Whey', '1 scoop', 25.0, 0.0, 0.0, 0),
  ('200g 2% Yogurt', '200g', 20.0, 6.0, 4.0, 0),
  ('200g 0% Fage', '200g', 21.0, 6.0, 0.0, 0),
  ('80g Frozen Blueberries', '80g', 0.0, 10.0, 0.0, 0),
  ('Banana', '1 medium', 0.0, 28.0, 0.0, 0),
  ('Almond Butter', '30g', 6.0, 5.0, 17.0, 0),
  ('Pea Shake', '1 portion', 32.0, 0.0, 7.0, 0),
  ('Protein Pasta', '112g', 20.0, 76.0, 0.0, 0),
  ('Chick-fil-A Spicy Biscuit', '1 biscuit', 19.0, 44.0, 22.0, 0),
  ('Can of Tuna', '1 can', 25.0, 1.0, 5.0, 0),
  ('Cheez-Its', '30g', 3.0, 17.0, 8.0, 0),
  ('Amy''s Tortellini Pesto Bowl', '1 bowl', 20.0, 62.0, 22.0, 0),
  ('Amy''s Mac and Cheese', '1 portion', 19.0, 55.0, 18.0, 0),
  ('1 Cup Cranberry Juice', '1 cup', 0.0, 28.0, 0.0, 0),
  ('Fairlife Core Power', '42g protein', 42.0, 9.0, 3.5, 0),
  ('Lemon Cake Pure Protein Bar', '1 bar', 20.0, 14.0, 7.0, 0),
  ('Peanut Butter Crunch Quest Bar', '1 bar', 18.0, 4.0, 11.0, 0),
  ('Muscle Milk', '40g protein', 40.0, 8.0, 2.0, 0),
  ('Fage 0 Little Container', '1 container', 15.0, 5.0, 0.0, 0),
  ('Mary''s Gone Crackers Super Seed', '30g', 5.0, 6.0, 7.0, 0),
  ('1 Whole Wheat Pita', '1 loaf', 10.0, 28.0, 0.0, 0),
  ('Granola Cascadian Farms Coconut', '63g', 5.0, 36.0, 18.0, 0),
  ('8oz Boars Head Oven Gold Turkey', '8oz', 44.0, 0.0, 4.0, 0),
  ('Pret Chicken Parm Wrap', '1 wrap', 37.0, 53.0, 24.0, 0),
  ('Milano Two-Pack', '1 pack', 1.0, 16.0, 7.0, 0),
  ('Pret Breakfast Burrito', '1 burrito', 25.0, 57.0, 23.0, 0),
  ('Pret Egg White Greek Frittata', '1 portion', 28.0, 6.0, 6.0, 0),
  ('Pret Tikka Masala Grain Bowl', '1 bowl', 35.0, 31.0, 14.0, 0),
  ('WF Mac and Cheese', '4oz', 10.0, 20.0, 12.0, 0),
  ('Idahoan', '1 portion', 2.0, 20.0, 3.0, 0),
  ('Catalina Crunch', '36g', 11.0, 5.0, 5.0, 0),
  ('Beet Juice', '8oz', 3.0, 22.0, 0.0, 0),
  ('DiGiorno Pepperoni Pizza', 'whole pizza', 70.0, 280.0, 65.0, 0),
  ('Blue Chips', '28g', 2.0, 17.0, 7.0, 0),
  ('WF Shredded Mexican Cheese', '28g', 6.0, 0.0, 8.0, 0),
  ('Frozen Scallops', '4oz', 19.0, 7.0, 1.0, 0),
  ('Lipton Soup', '1 packet, extra noodle', 18.0, 90.0, 9.0, 0),
  ('Amy''s Broccoli Cheddar Bowl', '1 bowl', 18.0, 51.0, 20.0, 0),
  ('WF Clam Chowder', 'whole tub', 29.0, 55.0, 60.0, 0);

-- =====================================================
-- UPDATE COMPLETE!
-- =====================================================
-- Foods database has been updated with the comprehensive list.
-- Total foods: 66 items
-- 
-- Verify by running:
-- SELECT COUNT(*) FROM foods;
-- SELECT * FROM foods ORDER BY name LIMIT 10;
-- =====================================================