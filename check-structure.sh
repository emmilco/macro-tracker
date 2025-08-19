
#!/bin/bash

echo "🔍 Checking for problematic files..."

echo
echo "📁 Current src/ structure:"
find src -type f | sort

echo
echo "❓ Checking services/database.ts..."
if [ -f "src/services/database.ts" ]; then
    echo "📄 Found src/services/database.ts - showing first 20 lines:"
    head -20 src/services/database.ts
    echo
    echo "🗑️  This file might be causing issues. Should we remove it? (The main app uses src/supabase.ts instead)"
else
    echo "✅ No services/database.ts found"
fi

echo
echo "🧹 Suggested fixes:"
echo "1. Remove src/services/ directory if it exists: rm -rf src/services/"
echo "2. Make sure only these files exist in src/:"
echo "   - App.tsx"
echo "   - App.module.css"
echo "   - types.ts"
echo "   - supabase.ts"
echo "   - main.tsx"
echo "   - css-modules.d.ts"