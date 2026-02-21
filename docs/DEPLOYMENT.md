# Deployment and Configuration Guide

## 1. Supabase Setup
1. Create a Supabase project.
2. Run the SQL in `docs/SUPABASE_SCHEMA.sql` using the SQL Editor.
3. Confirm RLS is enabled for all tables.
4. Enable Auth providers:
   - Email/Password
   - Magic Link (optional)
5. Add redirect URLs:
   - Web dev: `http://localhost:8081`
   - Web prod: your Vercel domain
   - Mobile: `freno://` (or use Expo proxy in dev)

## 2. Environment Variables
Copy `.env.example` to `.env` in project root:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Web Deployment (Vercel)
1. Connect this repo to Vercel.
2. Add environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Build configuration:
   - The `vercel.json` file is already configured with the correct build command and output directory.
   - Build command: `npm run build:web` (exports static web build)
   - Output directory: `web-build`
   - Vercel will automatically detect and use these settings.

## 4. Mobile Builds (Expo EAS)
1. Install EAS CLI:
   - `npm install -g eas-cli`
2. Configure EAS:
   - `eas build:configure`
3. Build:
   - `eas build --platform ios`
   - `eas build --platform android`

## 5. Required Inputs from You
- Supabase URL + anon key
- Auth email configuration (optional SMTP)
- App icons/splash art if you want custom branding
