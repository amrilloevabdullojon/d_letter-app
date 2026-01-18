-- Ensure dedupeKey column exists in Notification table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Notification' AND column_name = 'dedupeKey'
    ) THEN
        ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
    END IF;
END $$;

-- Ensure index on dedupeKey and createdAt exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Notification_dedupeKey_createdAt_idx'
    ) THEN
        CREATE INDEX "Notification_dedupeKey_createdAt_idx" ON "Notification"("dedupeKey", "createdAt");
    END IF;
END $$;
