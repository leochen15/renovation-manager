import { createClient } from '@supabase/supabase-js';
import { createMockSupabase } from '../mocks/mockSupabase';
import { mockViewer } from '../mocks/mockDb';
import { trackEvent } from './analytics';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';
const mockUserRole = process.env.EXPO_PUBLIC_MOCK_USER;
const mockUser = mockUserRole === 'viewer' ? mockViewer : undefined;
const trackedSuccessMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const getRequestMethod = (input: RequestInfo | URL, init: RequestInit | undefined) =>
  (init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')).toUpperCase();

const normalizePath = (url: URL) => {
  const segments = url.pathname.split('/').filter(Boolean);
  return segments.slice(0, 3).join('/') || 'root';
};

const trackSupabaseResponse = (input: RequestInfo | URL, init: RequestInit | undefined, response: Response) => {
  if (!supabaseUrl) return;

  const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
  const baseUrl = new URL(supabaseUrl);
  const method = getRequestMethod(input, init);

  if (requestUrl.origin !== baseUrl.origin) return;

  if (response.ok && !trackedSuccessMethods.has(method)) {
    return;
  }

  const eventName = response.ok ? 'supabase_request_success' : 'supabase_request_failure';
  trackEvent(eventName, {
    method,
    service: requestUrl.pathname.split('/').filter(Boolean)[0] ?? 'unknown',
    route: normalizePath(requestUrl),
    status: response.status,
  });
};

const trackSupabaseNetworkError = (input: RequestInfo | URL, init: RequestInit | undefined) => {
  if (!supabaseUrl) return;

  const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
  const baseUrl = new URL(supabaseUrl);
  const method = getRequestMethod(input, init);

  if (requestUrl.origin !== baseUrl.origin) return;

  trackEvent('supabase_request_failure', {
    method,
    service: requestUrl.pathname.split('/').filter(Boolean)[0] ?? 'unknown',
    route: normalizePath(requestUrl),
    status: 0,
    failure_type: 'network',
  });
};

const analyticsFetch: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, init);
    trackSupabaseResponse(input, init, response);
    return response;
  } catch (error) {
    trackSupabaseNetworkError(input, init);
    throw error;
  }
};

if (!useMocks && (!supabaseUrl || !supabaseAnonKey)) {
  // eslint-disable-next-line no-console
  console.warn('Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = useMocks
  ? createMockSupabase({ user: mockUser })
  : createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
      global: {
        fetch: analyticsFetch,
      },
    });
