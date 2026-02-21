# Runbook

## Local development
1. Install dependencies:
   - `npm install`
2. Create `.env` in repo root.
3. Start dev server:
   - `npm start`
4. Run web:
   - press `w`

## Mock mode (offline UI)
- Set `EXPO_PUBLIC_USE_MOCKS=true` in `.env`
- See `docs/MOCK_MODE.md`

## Common issues
- If auth doesn’t work, verify Supabase URL + anon key and Auth redirect URLs.
- If tables are empty, ensure you’ve run `docs/SUPABASE_SCHEMA.sql`.
