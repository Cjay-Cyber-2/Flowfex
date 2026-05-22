-- Run once against the Syniq Neon/Postgres database (Better Auth "user" table).
-- Marks every existing account as having already completed handle selection.
-- New OAuth users get syniqHandleChosen = false until they finish /choose-username.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "syniqHandleChosen" boolean NOT NULL DEFAULT false;

-- Legacy column from an earlier Drizzle mapping (flowfexHandleChosen).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'flowfexHandleChosen'
  ) THEN
    UPDATE "user" SET "syniqHandleChosen" = COALESCE("flowfexHandleChosen", "syniqHandleChosen");
    ALTER TABLE "user" DROP COLUMN "flowfexHandleChosen";
  END IF;
END $$;

UPDATE "user" SET "syniqHandleChosen" = true WHERE "syniqHandleChosen" IS NOT TRUE;
