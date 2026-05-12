-- Run once against the Flowfex Neon/Postgres database (Better Auth "user" table).
-- Marks every existing account as having already completed handle selection.
-- New OAuth users get flowfexHandleChosen = false until they finish /choose-username.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "flowfexHandleChosen" boolean NOT NULL DEFAULT false;
UPDATE "user" SET "flowfexHandleChosen" = true;
