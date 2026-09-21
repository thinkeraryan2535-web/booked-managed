# BBD Mobile Event Management App

## Goal
Build the complete invite-only BBD event management experience from the supplied PRD. The app will be designed first for 375–414px phones, remain centered at about 480px on desktop, and be ready for a later Capacitor wrapper.

## Product and visual direction
- Replace every “Mantezo” reference with **BBD**.
- Use a restrained Vercel/Geist-inspired black interface: pure black canvas, near-black surfaces, fine borders, solid white actions, no gradients, glow, glass, or decorative effects.
- Use Geist Sans throughout and Geist Mono for amounts, phone numbers, times, and IDs.
- Keep every tap target at least 44px, use safe-area spacing, fixed bottom navigation, sticky form actions, stacked mobile forms, horizontally scrolling chips, and touch-first interactions.
- Treat the uploaded screenshot as visual reference only, not as an embedded image.

## What will be built
1. Mock phone OTP sign-in with 6-digit verification and resend countdown.
2. Home with greeting, notifications, interactive month calendar, booking heart markers, upcoming events, drawer, and add-booking action.
3. Rich booked-day view and separate empty-day view.
4. Complete add-booking form with every field and validation from the PRD.
5. Tabbed event details: Overview, Tasks, and Team.
6. Team directory with full profiles, search, presence filters, and add-member flow.
7. Bookings list with All, Upcoming, and Past views.
8. Tasks with My, Team, and All views; completion moves tasks to the bottom and preserves the archive.
9. Notifications and settings, including profile details and dark appearance state.
10. Revenue view using Indian financial-year rules, with previous years and booking breakdowns archived rather than deleted.
11. Shared mobile navigation, sheets, cards, status labels, inputs, tabs, empty states, loading placeholders, and feedback messages.

## Data and behavior
- Enable Lovable Cloud for durable bookings, tasks, profiles, notifications, and revenue history.
- Add separate secure role records for Admin and Team Member permissions; roles will not be stored on profiles.
- Add full user profiles with name, avatar, role display, presence, and preferences.
- Keep OTP verification mocked as requested; no real SMS call will be made yet.
- Seed representative BBD demo records so every major screen is immediately testable.
- Apply access rules so invited team members can view shared operational data, while administrative changes remain role-controlled.

## Validation
- Check all routes and interactions at phone width and desktop-centered width.
- Verify booking creation, calendar updates, task completion ordering, completed archive, filters, tabs, drawer, and financial-year totals.
- Confirm no text clipping, overlapping controls, undersized tap targets, white loading flashes, or missing empty/error states.
- Add unique BBD page titles and descriptions for every content route.

## Build sequence
Design system and shared shell → mocked OTP → Cloud schema and profiles → Home/calendar → day views → booking form → event details → team → bookings → tasks/archive → notifications/settings → revenue archive → phone and interaction verification.
