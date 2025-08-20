#!/bin/bash

echo "🚀 Deploying Macro Tracker with Meal Builder..."

echo
echo "🧹 Cleaning previous build..."
rm -rf dist

echo
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo
    echo "📦 Build output is ready in ./dist/"
    echo
    echo "🍽️ NEW: Meal Builder Feature Complete!"
    echo "   🔍 Search bar moved back to Food Database section"
    echo "   ➕ New 'Meal Builder' tab in navigation"
    echo "   🥘 Build complex meals from multiple foods"
    echo "   🧮 Automatic macro calculation per portion"
    echo "   💾 Save meals as new foods in database"
    echo "   📱 Fully mobile optimized"
    echo
    echo "✨ Meal Builder workflow:"
    echo "   1. Enter meal name + number of portions"
    echo "   2. Add foods from database with quantities"
    echo "   3. See real-time macro totals per portion"
    echo "   4. Save as new food (1 portion = calculated macros)"
    echo "   5. Use your custom meal like any other food"
    echo
    echo "🌐 To deploy to Netlify:"
    echo "   1. Drag and drop the ./dist folder to Netlify"
    echo "   2. Or use Netlify CLI: netlify deploy --prod --dir=dist"
    echo
    echo "💡 Example use cases:"
    echo "   • Create 'Protein Smoothie' from multiple ingredients"
    echo "   • Build 'Chicken Rice Bowl' with exact portions"
    echo "   • Make 'Pre-workout Snack' with perfect macros"
    echo
    echo "🎯 Perfect for:"
    echo "   • Meal prep recipes"
    echo "   • Complex dishes with multiple ingredients"
    echo "   • Consistent macro tracking of custom meals"
    echo
    echo "🎉 Your macro tracker now builds custom meals!"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi