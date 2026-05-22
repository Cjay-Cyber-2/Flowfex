-- Durable anonymous visitor anchor (httpOnly cookie fx_visitor).
-- Prevents quota reset by minting a new anonymous session after clearing local storage.

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "visitor_anchor" text;

CREATE INDEX IF NOT EXISTS "sessions_visitor_anchor_idx"
  ON "sessions" ("visitor_anchor")
  WHERE "visitor_anchor" IS NOT NULL;
