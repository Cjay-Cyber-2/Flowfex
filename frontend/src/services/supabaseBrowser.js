import { createBrowserClient } from '@supabase/ssr';

let browserClient = null;

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL
    && import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
      import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return browserClient;
}
