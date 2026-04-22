import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../packages/types/supabase';

export type SupabaseSameSite = 'lax' | 'strict' | 'none';

export interface SupabaseCookieOptions {
  readonly domain?: string;
  readonly expires?: Date;
  readonly httpOnly?: boolean;
  readonly maxAge?: number;
  readonly path?: string;
  readonly sameSite?: SupabaseSameSite;
  readonly secure?: boolean;
}

export interface SupabaseCookie {
  readonly name: string;
  readonly value: string;
  readonly options?: SupabaseCookieOptions;
}

export interface SupabaseCookieStore {
  getAll(): ReadonlyArray<Pick<SupabaseCookie, 'name' | 'value'>>;
  setAll(cookies: ReadonlyArray<SupabaseCookie>): void;
}

export interface NodeRequestLike {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

export interface NodeResponseLike {
  getHeader(name: string): number | string | string[] | undefined;
  setHeader(name: string, value: number | string | readonly string[]): void;
}

function readRequiredServerEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookieHeader(headerValue: string | string[] | undefined): Map<string, string> {
  const source = Array.isArray(headerValue) ? headerValue.join(';') : headerValue ?? '';
  const cookies = new Map<string, string>();

  for (const segment of source.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!name) {
      continue;
    }

    cookies.set(name, decodeCookieValue(value));
  }

  return cookies;
}

function formatSameSite(value: SupabaseSameSite): 'Lax' | 'Strict' | 'None' {
  if (value === 'none') {
    return 'None';
  }

  if (value === 'strict') {
    return 'Strict';
  }

  return 'Lax';
}

function serializeCookie(cookie: SupabaseCookie): string {
  const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`];
  const options = cookie.options;

  parts.push(`Path=${options?.path ?? '/'}`);

  if (typeof options?.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  if (options?.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options?.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options?.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options?.secure) {
    parts.push('Secure');
  }

  if (options?.sameSite) {
    parts.push(`SameSite=${formatSameSite(options.sameSite)}`);
  }

  return parts.join('; ');
}

export function createNodeCookieStore(
  request: NodeRequestLike,
  response: NodeResponseLike
): SupabaseCookieStore {
  const requestCookies = parseCookieHeader(request.headers.cookie);

  return {
    getAll() {
      return Array.from(requestCookies.entries(), ([name, value]) => ({ name, value }));
    },
    setAll(cookies) {
      for (const cookie of cookies) {
        requestCookies.set(cookie.name, cookie.value);
      }

      const serializedCookies = cookies.map(serializeCookie);
      const existingHeader = response.getHeader('Set-Cookie');
      const existingValues = Array.isArray(existingHeader)
        ? [...existingHeader]
        : typeof existingHeader === 'string'
          ? [existingHeader]
          : [];

      response.setHeader('Set-Cookie', [...existingValues, ...serializedCookies]);
    },
  };
}

export function createSupabaseServerClient(
  cookieStore: SupabaseCookieStore
): SupabaseClient<Database> {
  const supabaseUrl = readRequiredServerEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = readRequiredServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookies) {
        cookieStore.setAll(
          cookies.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options,
          }))
        );
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
