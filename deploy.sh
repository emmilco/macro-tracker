#!/bin/bash

echo "🚀 Deploying Macro Tracker with Authentication..."

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
    echo "🔐 NEW: Multi-User Authentication!"
    echo "   🔑 Google OAuth integration with Supabase"
    echo "   👤 Individual user accounts and data isolation"
    echo "   🛡️  Row Level Security for complete privacy"
    echo "   ⚡ Automatic user setup with default foods"
    echo "   🎯 Personal macro targets and food databases"
    echo
    echo "🔥 Features included:"
    echo "   📊 Total calories display with macro bars"
    echo "   🍽️  Meal Builder for custom recipes"
    echo "   🔍 Smart search functionality"
    echo "   📱 Mobile-optimized design"
    echo "   🔐 Secure Google Sign-In"
    echo
    echo "🛠️  IMPORTANT: Setup Required Before Deployment"
    echo "   1. Configure Google OAuth in Supabase Dashboard"
    echo "   2. Run database/add_auth_schema.sql in Supabase"
    echo "   3. Update Supabase credentials in src/supabase.ts"
    echo "   4. See SETUP_AUTHENTICATION.md for details"
    echo
    echo "🌐 To deploy to Netlify:"
    echo "   1. Complete authentication setup first"
    echo "   2. Drag and drop the ./dist folder to Netlify"
    echo "   3. Or use Netlify CLI: netlify deploy --prod --dir=dist"
    echo "   4. Update redirect URLs in Google Cloud Console"
    echo
    echo "💡 What users will experience:"
    echo "   • Secure Google sign-in on first visit"
    echo "   • Personal food database with 10 default items"
    echo "   • Private macro tracking and meal building"
    echo "   • Individual settings and preferences"
    echo "   • Complete data privacy and isolation"
    echo
    echo "🎉 Your macro tracker is now a full multi-user app!"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi