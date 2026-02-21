import { createClient } from '@supabase/supabase-js';
import { createMockSupabase } from '../mocks/mockSupabase';
import { mockViewer } from '../mocks/mockDb';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';
const mockUserRole = process.env.EXPO_PUBLIC_MOCK_USER;
const mockUser = mockUserRole === 'viewer' ? mockViewer : undefined;

if (!useMocks && (!supabaseUrl || !supabaseAnonKey)) {
  // eslint-disable-next-line no-console
  console.warn('Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = useMocks
  ? createMockSupabase({ user: mockUser })
  : createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
