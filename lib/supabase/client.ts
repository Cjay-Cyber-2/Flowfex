import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../packages/types/supabase';

interface BrowserEnv {
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface BrowserImportMetaShape {
  readonly env?: BrowserEnv;
}

let browserClient: SupabaseClient<Database> | null = null;

function readBrowserEnv(): BrowserEnv {
  const importMetaShape = import.meta as BrowserImportMetaShape;
  return importMetaShape.env ?? {};
}

function readRequiredBrowserSupabaseConfig(): {
  readonly url: string;
  readonly anonKey: string;
} {
  const env = readBrowserEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in the browser environment.');
  }

  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in the browser environment.');
  }

  return { url, anonKey };
}

export function isSupabaseBrowserConfigured(): boolean {
  try {
    readRequiredBrowserSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, anonKey } = readRequiredBrowserSupabaseConfig();

    browserClient = createBrowserClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}
