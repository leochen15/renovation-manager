# Mock Mode (Offline UI)

Use mock mode to run the UI locally without Supabase.

## Enable
1. Copy `.env.example` to `.env` (if you haven't already)
2. Add:
```
EXPO_PUBLIC_USE_MOCKS=true
```

## What it does
- Uses in-memory mock data defined in `src/mocks/mockDb.ts`
- Bypasses Supabase auth and uses a mock user
- All CRUD operations update the in-memory store for this session only

## Disable
Remove `EXPO_PUBLIC_USE_MOCKS` or set it to `false`.
