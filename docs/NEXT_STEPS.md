# Deployment, Configuration, and Required Inputs

This document lists the required setup steps and configuration values for deploying the Renovation Manager MVP.

## 1. Create a Supabase Project
- Create a new Supabase project.
- Save the following values:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

## 2. Database Schema + RLS
- Run the SQL in `docs/SUPABASE_SCHEMA.sql`.
- Confirm Row-Level Security (RLS) is enabled on all tables.

## 3. Auth Configuration
- Enable Email/Password login.
- Enable Magic Link (optional but recommended).
- Configure redirect URLs for web and mobile.

## 4. Environment Variables
Create `.env` files for web and mobile with:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 5. Web Deployment (Vercel)
- Connect the repo to Vercel.
- Set the same environment variables in Vercel.
- Build command should be Expo web (final command to be decided during implementation).

## 6. Mobile Builds (Expo EAS)
- Install EAS CLI locally.
- Configure `eas.json` and run:
  - `eas build --platform ios`
  - `eas build --platform android`

## 7. Required Inputs from You
Please prepare:
- Supabase project URL + anon key
- Preferred auth email provider settings (if using custom SMTP)
- Project name, default address format, and any budget categories you want preloaded

## 8. Optional Enhancements (Post-MVP)
- File uploads for notices and tasks
- Push notifications for schedule changes
- Role-based access beyond owner/collaborator
