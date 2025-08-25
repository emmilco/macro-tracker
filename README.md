# Macro Tracker

> [!NOTE]  
> This application was built largely as an exercise in using an LLM to code. Nearly all of the code is AI-generated. This should also explain some of the peculiarities of the project, including the minimal file structure (which was chose to make code changes more efficient for rapid development). Everything from here on out in this README is AI-generated.

A comprehensive macro tracking web application built with React, TypeScript, and Supabase. Track your daily food intake with real-time macro calculations, support for workout/rest day targets, and a beautiful modern interface.

![Macro Tracker Screenshot](screenshot.png)

## Features

- 📊 **Real-time Macro Tracking** - Visual progress bars showing protein, carbs, and fat intake
- 🏋️ **Workout/Rest Day Support** - Different macro targets for training and recovery days
- 🍎 **Food Database** - Pre-populated with common foods, frequency tracking, full CRUD operations
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 💾 **Historical Preservation** - Food edits don't affect past entries (data integrity)
- ⚡ **Real-time Updates** - Instant feedback as you add foods and adjust quantities
- 🎨 **Modern UI** - Clean, professional design with subdued but cheerful colors

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS Modules (no PostCSS configuration needed)
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Netlify-ready
- **Cost**: 100% free tier compatible

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd macro-tracker
npm install
```

### 2. Set up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the schema from `database/schema.sql`
4. Get your project URL and anon key from Settings > API

### 3. Configure Environment

Update `src/supabase.ts` with your Supabase credentials:

```typescript
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app!

### 5. Deploy to Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Or connect your GitHub repo for automatic deployments

## Database Schema

The app uses a carefully designed schema that preserves historical data:

- **foods** - Master food database with frequency tracking
- **daily_entries** - Daily logs with workout/rest day types
- **food_entries** - Specific food consumption with historical snapshots
- **user_settings** - Macro targets for both day types

## Key Features Explained

### Historical Data Preservation

When you edit a food's macros, it only affects future entries. Past daily logs retain the original food data as "snapshots" in the `food_entries` table.

### Frequency Tracking

Foods are automatically sorted by usage frequency, putting your most-used items at the top for quick access.

### Macro Visualization

Vertical bar charts provide intuitive progress tracking with color-coded macros:

- 🟢 Protein (muted pink)
- 🔵 Carbs (sage green)
- 🟡 Fat (warm amber)

### Responsive Design

The interface adapts beautifully to all screen sizes with CSS Grid and Flexbox layouts.

## Default Foods

The app comes pre-populated with 10 common foods:

- Ground Beef (93/7) - 8oz serving
- Jasmine Rice - 1 cup cooked
- Large Banana - 1 large (126g)
- Whole Eggs - 2 large eggs
- Broccoli - 1 cup chopped
- Olive Oil - 1 tablespoon
- Chicken Thigh - 180g cooked
- Chicken Breast - 180g cooked
- Shrimp - 6oz
- Tilapia - 4oz

## Default Macro Targets

- **Workout Day**: 180g protein, 250g carbs, 80g fat (2,040 calories)
- **Rest Day**: 180g protein, 150g carbs, 100g fat (1,940 calories)

## File Structure

```
macro-tracker/
├── src/
│   ├── App.tsx           # Main application component
│   ├── App.module.css    # All styles using CSS modules
│   ├── types.ts          # TypeScript interfaces
│   ├── supabase.ts       # Database client and utilities
│   └── main.tsx          # React entry point
├── database/
│   └── schema.sql        # Complete database schema
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
```

## Customization

### Colors

Update CSS variables in `App.module.css`:

```css
:root {
  --protein-color: #d97098; /* Muted pink */
  --carbs-color: #5fa877; /* Sage green */
  --fat-color: #e6a852; /* Warm amber */
  --primary-gradient: linear-gradient(135deg, #6b7fce 0%, #7c63a8 100%);
}
```

### Macro Targets

Modify defaults in the settings page or update the database schema.

### Food Database

Add your own foods through the UI or bulk import via SQL.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify your Supabase connection
3. Ensure the database schema is properly set up
4. Open an issue with details about the problem

---

Built with ❤️ for the fitness and nutrition community.
