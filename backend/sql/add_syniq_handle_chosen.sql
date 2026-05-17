-- Run once against the Syniq Neon/Postgres database (Better Auth "user" table).
-- Marks every existing account as having already completed handle selection.
-- New OAuth users get syniqHandleChosen = false until they finish /choose-username.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "syniqHandleChosen" boolean NOT NULL DEFAULT false;
UPDATE "user" SET "syniqHandleChosen" = true;
