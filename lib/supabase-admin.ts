import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';
import { createDbHelpers } from './supabase';

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrlEnv) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

const SUPABASE_URL = supabaseUrlEnv;

type AdminClient = SupabaseClient<Database, 'public'>;
type AdminHelpers = ReturnType<typeof createDbHelpers>;

let cachedClient: AdminClient | null = null;
let cachedHelpers: AdminHelpers | null = null;

function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'Missing env.SUPABASE_SERVICE_ROLE_KEY. Add your Supabase service role key to the environment to enable server-side database access.',
    );
  }
  return key;
}

function ensureAdminClient(): AdminClient {
  if (!cachedClient) {
    const serviceRoleKey = requireServiceRoleKey();
  cachedClient = createClient<Database, 'public'>(SUPABASE_URL, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient!;
}

function ensureAdminHelpers(): AdminHelpers {
  if (!cachedHelpers) {
    cachedHelpers = createDbHelpers(ensureAdminClient());
  }
  return cachedHelpers!;
}

export function getSupabaseAdmin(): AdminClient {
  return ensureAdminClient();
}

export function getAdminDbHelpers(): AdminHelpers {
  return ensureAdminHelpers();
}

export const adminDbHelpers = new Proxy(
  {},
  {
    get(_target, prop) {
      const helpers = ensureAdminHelpers();
      const value = helpers[prop as keyof AdminHelpers];
      if (typeof value === 'function') {
        return value.bind(helpers);
      }
      return value;
    },
  },
) as AdminHelpers;

export default getSupabaseAdmin;

