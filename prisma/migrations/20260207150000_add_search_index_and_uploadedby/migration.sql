-- Enable pg_trgm extension for trigram-based search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index for fast ILIKE search on Letter fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_letter_search_trgm"
ON "Letter" USING gin (
  (COALESCE("number", '') || ' ' || COALESCE("org", '') || ' ' || COALESCE("content", '')) gin_trgm_ops
);

-- Individual trigram indexes for the most searched fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_letter_number_trgm"
ON "Letter" USING gin ("number" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_letter_org_trgm"
ON "Letter" USING gin ("org" gin_trgm_ops);

-- Add uploadedById column to File
ALTER TABLE "File" ADD COLUMN "uploadedById" TEXT;

-- Add foreign key constraint
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for uploadedById
CREATE INDEX "File_uploadedById_idx" ON "File"("uploadedById");
