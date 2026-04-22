import { createClient } from '@supabase/supabase-js';

let adminClient = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  }

  return adminClient;
}

export async function resolveSupabaseUser(accessToken) {
  if (!accessToken) {
    return null;
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.getUser(accessToken);

  if (error) {
    throw error;
  }

  return data.user || null;
}
