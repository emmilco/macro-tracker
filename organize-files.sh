#!/bin/bash

# MacroTracker File Organization Script
# This script organizes downloaded artifacts into the proper folder structure

echo "🗂️  MacroTracker File Organization Script"
echo "========================================"

# Check if we're in the right directory
if [[ ! "$(basename "$(pwd)")" == "macro-tracker" ]]; then
    echo "❌ Please run this script from the macro-tracker directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Create the proper folder structure
echo "📁 Creating folder structure..."
mkdir -p src/{components/{Header,Navigation,MacroProgress,FoodTile,AddFoodForm,History},services,types,lib,styles}
mkdir -p public

echo "✅ Folder structure created"

# Function to move and rename file
move_file() {
    local source="$1"
    local destination="$2"
    local filename="$3"
    
    if [[ -f "$source" ]]; then
        echo "📄 Moving $(basename "$source") → $destination/$filename"
        mv "$source" "$destination/$filename"
    fi
}

# Function to identify and organize files
organize_files() {
    echo ""
    echo "🔍 Analyzing and organizing files..."
    
    for file in *; do
        # Skip directories and the script itself
        [[ -d "$file" ]] && continue
        [[ "$file" == "organize-files.sh" ]] && continue
        [[ "$file" == "$(basename "$0")" ]] && continue
        
        echo "🔍 Analyzing: $file"
        
        # Read first few lines to identify file type
        header=$(head -10 "$file" 2>/dev/null)
        content=$(cat "$file" 2>/dev/null)
        
        # Identify file based on content patterns
        if [[ "$content" =~ "\"name\": \"macro-tracker\"" ]]; then
            move_file "$file" "." "package.json"
            
        elif [[ "$content" =~ "defineConfig" && "$content" =~ "vite" ]]; then
            move_file "$file" "." "vite.config.ts"
            
        elif [[ "$content" =~ "\"compilerOptions\"" && "$content" =~ "\"target\": \"ES2020\"" ]]; then
            move_file "$file" "." "tsconfig.json"
            
        elif [[ "$content" =~ "\[build\]" && "$content" =~ "netlify" ]]; then
            move_file "$file" "." "netlify.toml"
            
        elif [[ "$content" =~ "VITE_SUPABASE_URL" && "$content" =~ "your_supabase" ]]; then
            move_file "$file" "." ".env.example"
            
        elif [[ "$content" =~ "CREATE TABLE" && "$content" =~ "foods" ]]; then
            move_file "$file" "." "database-schema.sql"
            
        elif [[ "$content" =~ "MacroTracker Setup Script" ]]; then
            move_file "$file" "." "setup.sh"
            chmod +x "setup.sh" 2>/dev/null
            
        elif [[ "$content" =~ "# MacroTracker" && "$content" =~ "modern, comprehensive macro tracking" ]]; then
            move_file "$file" "." "README.md"
            
        elif [[ "$content" =~ "MacroTracker Feature Checklist" ]]; then
            move_file "$file" "." "feature-checklist.md"
            
        # TypeScript types
        elif [[ "$content" =~ "// src/types/index.ts" || "$content" =~ "export interface Food" ]]; then
            move_file "$file" "src/types" "index.ts"
            
        # Supabase config
        elif [[ "$content" =~ "// src/lib/supabase.ts" || "$content" =~ "createClient" && "$content" =~ "supabase" ]]; then
            move_file "$file" "src/lib" "supabase.ts"
            
        # Database services
        elif [[ "$content" =~ "// src/services/database.ts" || "$content" =~ "getAllFoods" ]]; then
            move_file "$file" "src/services" "database.ts"
            
        # Global styles
        elif [[ "$content" =~ "/* src/styles/global.css" || "$content" =~ ":root" && "$content" =~ "--protein-color" ]]; then
            move_file "$file" "src/styles" "global.css"
            
        # Main App component
        elif [[ "$content" =~ "// src/App.tsx" || "$content" =~ "export const App" ]]; then
            move_file "$file" "src" "App.tsx"
            
        # App styles
        elif [[ "$content" =~ "/* src/App.module.css" ]]; then
            move_file "$file" "src" "App.module.css"
            
        # Main entry point
        elif [[ "$content" =~ "// src/main.tsx" || "$content" =~ "ReactDOM.createRoot" ]]; then
            move_file "$file" "src" "main.tsx"
            
        # HTML entry point
        elif [[ "$content" =~ "<!DOCTYPE html" && "$content" =~ "MacroTracker" ]]; then
            move_file "$file" "." "index.html"
            
        # Component files - Header
        elif [[ "$content" =~ "// src/components/Header/Header.tsx" || "$content" =~ "export const Header" ]]; then
            move_file "$file" "src/components/Header" "Header.tsx"
            
        elif [[ "$content" =~ "/* src/components/Header/Header.module.css" ]]; then
            move_file "$file" "src/components/Header" "Header.module.css"
            
        # Component files - Navigation
        elif [[ "$content" =~ "// src/components/Navigation/Navigation.tsx" || "$content" =~ "export const Navigation" ]]; then
            move_file "$file" "src/components/Navigation" "Navigation.tsx"
            
        elif [[ "$content" =~ "/* src/components/Navigation/Navigation.module.css" ]]; then
            move_file "$file" "src/components/Navigation" "Navigation.module.css"
            
        # Component files - MacroProgress
        elif [[ "$content" =~ "// src/components/MacroProgress/MacroProgress.tsx" || "$content" =~ "export const MacroProgress" ]]; then
            move_file "$file" "src/components/MacroProgress" "MacroProgress.tsx"
            
        elif [[ "$content" =~ "/* src/components/MacroProgress/MacroProgress.module.css" ]]; then
            move_file "$file" "src/components/MacroProgress" "MacroProgress.module.css"
            
        # Component files - FoodTile
        elif [[ "$content" =~ "// src/components/FoodTile/FoodTile.tsx" || "$content" =~ "export const FoodTile" ]]; then
            move_file "$file" "src/components/FoodTile" "FoodTile.tsx"
            
        elif [[ "$content" =~ "/* src/components/FoodTile/FoodTile.module.css" ]]; then
            move_file "$file" "src/components/FoodTile" "FoodTile.module.css"
            
        # Component files - AddFoodForm
        elif [[ "$content" =~ "// src/components/AddFoodForm/AddFoodForm.tsx" || "$content" =~ "export const AddFoodForm" ]]; then
            move_file "$file" "src/components/AddFoodForm" "AddFoodForm.tsx"
            
        elif [[ "$content" =~ "/* src/components/AddFoodForm/AddFoodForm.module.css" ]]; then
            move_file "$file" "src/components/AddFoodForm" "AddFoodForm.module.css"
            
        # Component files - History
        elif [[ "$content" =~ "// src/components/History/History.tsx" || "$content" =~ "export const History" ]]; then
            move_file "$file" "src/components/History" "History.tsx"
            
        elif [[ "$content" =~ "/* src/components/History/History.module.css" ]]; then
            move_file "$file" "src/components/History" "History.module.css"
            
        else
            echo "❓ Could not identify: $file (keeping in current location)"
        fi
    done
}

# Run the organization
organize_files

# Clean up any empty directories in components
echo ""
echo "🧹 Cleaning up empty directories..."
find src/components -type d -empty -delete 2>/dev/null

# Summary
echo ""
echo "📊 Organization Summary"
echo "======================"
echo "📁 Project structure:"
tree . -I 'node_modules|dist|.git' 2>/dev/null || find . -type d | head -20

echo ""
echo "✅ File organization complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm install"
echo "   2. Set up your .env file with Supabase credentials"
echo "   3. Run: npm run dev"
echo ""
echo "📚 Check README.md for detailed setup instructions"