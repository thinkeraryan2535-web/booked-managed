# Total Revenue Implementation

## Overview
Implemented dynamic total revenue calculation based on bookings for the current Indian Financial Year (April-March).

## What Was Done

### 1. Database Migration (`supabase/migrations/20260922190800_add_revenue_calculation.sql`)

Created the following database functions and views:

#### Functions:
- **`get_current_fy_label()`**: Returns the current Indian FY label (e.g., "2026-27")
- **`get_fy_revenue(fy_label)`**: Calculates total revenue and booking count for a specific FY
- **`get_current_fy_revenue()`**: Returns revenue data for the current FY

#### Views:
- **`revenue_breakdown`**: Shows individual booking details with revenue
- **`fy_revenue_summary`**: Aggregates revenue by financial year for archive display

### 2. Frontend Updates (`src/routes/index.tsx`)

Updated the `RevenueScreen` component to:
- Fetch real-time revenue data from the database
- Display current FY total revenue (sum of all `total_budget` from bookings)
- Show revenue breakdown by individual bookings
- Display archived financial years
- Auto-update when bookings are added/deleted using Supabase real-time subscriptions

## How It Works

### Revenue Calculation Logic:
1. **When a booking is created**: Its `total_budget` is automatically included in the current FY revenue calculation
2. **When a booking is deleted/cancelled**: It's removed from the revenue calculation, and the total updates automatically
3. **Financial Year**: Follows Indian FY (April 1 - March 31)
4. **Archive**: Previous financial years are shown in the archive section

### Real-time Updates:
The component subscribes to database changes, so:
- Adding a booking → Revenue increases immediately
- Deleting a booking → Revenue decreases immediately
- If all bookings are cancelled → Revenue shows ₹0

## Database Schema

The `bookings` table already has:
- `total_budget`: The budget amount that contributes to revenue
- `fy_label`: Financial year label (e.g., "2026-27")
- All bookings are automatically tagged with their FY

## Migration Deployment

To apply the migration to your Supabase database:

### Option 1: Via Lovable Dashboard
1. Go to your Lovable project
2. The migration file will be automatically detected and applied on next deployment

### Option 2: Manual SQL Execution
1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20260922190800_add_revenue_calculation.sql`
3. Paste and execute the SQL

### Option 3: Supabase CLI (if available)
```bash
supabase db push
```

## Testing

To test the implementation:

1. **Start the dev server**: `npm run dev`
2. **Navigate to Total Revenue** screen (via menu)
3. **Add a booking** with a total budget (e.g., ₹80,000)
4. **Check revenue screen** - should show ₹80,000
5. **Add another booking** (e.g., ₹80,000)
6. **Check revenue screen** - should show ₹1,60,000
7. **Delete all bookings**
8. **Check revenue screen** - should show ₹0

## Features

✅ Dynamic revenue calculation from bookings
✅ Current FY revenue display
✅ Revenue breakdown by booking
✅ Archive of previous financial years
✅ Real-time updates when bookings change
✅ Automatic FY detection (Indian financial year)
✅ Shows ₹0 when no bookings exist
✅ Formatted currency display (₹ Lakhs format)

## Notes

- Revenue is calculated as the sum of `total_budget` from all bookings in the current FY
- The `fy_label` field in bookings table determines which FY a booking belongs to
- Old FY data is preserved in the archive section
- The component automatically refreshes when bookings are added/deleted/updated
