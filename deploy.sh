#!/bin/bash

echo "🚀 Deploying Macro Tracker with search functionality..."

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
    echo "🔍 New features in this deployment:"
    echo "   ✨ Real-time search in Food Database"
    echo "   🎯 Filters foods as you type"
    echo "   🧹 Clear search button"
    echo "   📊 Search results counter"
    echo "   📱 Mobile optimized"
    echo
    echo "🌐 To deploy to Netlify:"
    echo "   1. Drag and drop the ./dist folder to Netlify"
    echo "   2. Or use Netlify CLI: netlify deploy --prod --dir=dist"
    echo
    echo "💡 After deployment, try searching for foods like:"
    echo "   • 'chicken' - shows all chicken items"
    echo "   • 'egg' - finds eggs and eggwhites"
    echo "   • 'amy' - shows Amy's products"
    echo
    echo "🎉 Your macro tracker now has lightning-fast search!"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi