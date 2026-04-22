import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../packages/types/supabase';

let adminClient: SupabaseClient<Database> | null = null;

function readRequiredServerEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error('lib/supabase/admin.ts is server-only and must never be imported in browser code.');
  }

  if (!adminClient) {
    const supabaseUrl = readRequiredServerEnv('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRoleKey = readRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY');

    adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}
