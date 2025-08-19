#!/bin/bash

echo "🚀 Deploying Macro Tracker with latest changes..."

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
    echo "🌐 To deploy to Netlify:"
    echo "   1. Drag and drop the ./dist folder to Netlify"
    echo "   2. Or use Netlify CLI: netlify deploy --prod --dir=dist"
    echo
    echo "💡 After deployment, do a hard refresh (Ctrl+F5 or Cmd+Shift+R)"
    echo "   to see the new theme colors and square bar charts!"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi