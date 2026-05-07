import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../db/schema.js";

// Enable WebSocket support for local Node.js (Render has this natively)
neonConfig.webSocketConstructor = ws;

const DEFAULT_AUTH_BASE_URL = "http://localhost:4000";
const DEFAULT_TRUSTED_ORIGINS = [
  "https://flowfex.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function normalizeUrl(value, { originOnly = false } = {}) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = trimmed.includes("://")
    ? [trimmed]
    : trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")
      ? [`http://${trimmed}`]
      : [`https://${trimmed}`];

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      const normalized = originOnly ? parsed.origin : parsed.toString();
      return trimTrailingSlash(normalized);
    } catch {
      continue;
    }
  }

  return null;
}

function resolveAuthBaseUrl() {
  return normalizeUrl(
    process.env.BETTER_AUTH_URL
      || process.env.FLOWFEX_PUBLIC_ORIGIN
      || process.env.RENDER_EXTERNAL_URL
      || DEFAULT_AUTH_BASE_URL
  ) || DEFAULT_AUTH_BASE_URL;
}

function resolveFrontendAppOrigin() {
  return normalizeUrl(
    process.env.FLOWFEX_APP_URL
      || process.env.FRONTEND_URL
      || process.env.FRONTEND_ORIGIN
      || process.env.APP_URL
      || process.env.VITE_APP_URL,
    { originOnly: true }
  );
}

function requiresCrossSiteCookies() {
  const backendOrigin = normalizeUrl(resolveAuthBaseUrl(), { originOnly: true });
  const appOrigin = resolveFrontendAppOrigin();

  return Boolean(
    backendOrigin
      && appOrigin
      && backendOrigin !== appOrigin
  );
}

function addTrustedOrigin(target, value) {
  const normalized = normalizeUrl(value, { originOnly: true });
  if (normalized) {
    target.add(normalized);
  }
}

function collectTrustedOrigins() {
  const trusted = new Set(DEFAULT_TRUSTED_ORIGINS);
  const baseUrl = resolveAuthBaseUrl();
  const envCandidates = [
    process.env.FLOWFEX_APP_URL,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_ORIGIN,
    process.env.APP_URL,
    process.env.VITE_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.FLOWFEX_PUBLIC_ORIGIN,
    process.env.RENDER_EXTERNAL_URL,
    process.env.VERCEL_URL,
    baseUrl,
  ];

  for (const candidate of envCandidates) {
    addTrustedOrigin(trusted, candidate);
  }

  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const allowedOrigin of allowedOrigins) {
    addTrustedOrigin(trusted, allowedOrigin);
  }

  return Array.from(trusted);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendResendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM || "";
  const replyTo = process.env.EMAIL_REPLY_TO || null;

  if (!apiKey || !from) {
    const message = "Password reset email is not configured. Set RESEND_API_KEY and EMAIL_FROM.";
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }

    console.warn(`[Flowfex Auth] ${message}`);
    console.info(`[Flowfex Auth] Reset email preview for ${to}: ${text}`);
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Resend returned ${response.status} while sending password reset email.`);
  }

  return response.json();
}

async function sendPasswordResetEmail({ user, url }) {
  const email = user?.email || "";
  if (!email) {
    throw new Error("Password reset email could not be sent because the account email is missing.");
  }

  const displayName = user?.name || user?.email || "there";
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(url);
  const subject = "Reset your Flowfex password";
  const text = [
    `Hi ${displayName},`,
    "",
    "Use the link below to reset your Flowfex password:",
    url,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="background:#081019;padding:32px;font-family:Inter,Arial,sans-serif;color:#e8edf2;">
      <div style="max-width:560px;margin:0 auto;background:#0d131b;border:1px solid rgba(0,212,170,0.16);border-radius:20px;padding:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#00d4aa;">Flowfex Security</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;color:#f8fafc;">Reset your password</h1>
        <p style="margin:0 0 24px;color:rgba(232,237,242,0.78);line-height:1.6;">Hi ${safeName}, use the secure link below to set a new password for your Flowfex account.</p>
        <a href="${safeUrl}" style="display:inline-block;padding:14px 20px;border-radius:14px;background:#00d4aa;color:#031014;text-decoration:none;font-weight:700;">Reset Password</a>
        <p style="margin:24px 0 8px;color:rgba(232,237,242,0.64);line-height:1.6;">If the button does not open, copy this link directly:</p>
        <p style="margin:0;word-break:break-word;"><a href="${safeUrl}" style="color:#7ffff0;">${safeUrl}</a></p>
        <p style="margin:24px 0 0;color:rgba(232,237,242,0.56);line-height:1.6;">If you did not request this reset, you can ignore this email.</p>
      </div>
    </div>
  `;

  return sendResendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

// Initialize Drizzle ORM with Neon Serverless WebSocket Pool
function resolveDatabaseConnectionString() {
  const configured = process.env.DATABASE_URL;
  if (configured && configured.trim().length > 0) {
    return configured;
  }

  // In production we refuse to silently fall back to a non-existent local
  // dummy database. Failing loudly here surfaces the missing secret in the
  // Render dashboard before any auth call can produce a confusing 500.
  const env = (process.env.NODE_ENV || '').toLowerCase();
  if (env === 'production') {
    throw new Error(
      'DATABASE_URL is required in production for Flowfex auth. Set it in the backend host environment.'
    );
  }

  // Local/dev/tests: keep a deterministic placeholder so the module still
  // loads when devs work without a database. Auth calls will fail until a
  // real URL is provided, which is the desired behavior for local work.
  return 'postgres://flowfex_dev:flowfex_dev@localhost:5432/flowfex_dev';
}

const pool = new Pool({
  connectionString: resolveDatabaseConnectionString(),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
const useCrossSiteCookies = requiresCrossSiteCookies();

// Initialize Better Auth
export const auth = betterAuth({
  baseURL: resolveAuthBaseUrl(),
  trustedOrigins: collectTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg", // PostgreSQL
    schema,
  }),
  account: {
    // Split frontend/backend deployments can drop the extra state cookie even when
    // Better Auth already persists OAuth state in the database. Keep the stronger
    // server-side state store and skip the redundant cookie check.
    storeStateStrategy: "database",
    skipStateCookieCheck: true,
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => sendPasswordResetEmail({ user, url }),
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  plugins: [
    jwt({
      jwt: {
        secret: process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET,
      },
    }),
  ],
  advanced: {
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production" || useCrossSiteCookies,
      sameSite: useCrossSiteCookies ? "none" : "lax",
    },
  },
});
