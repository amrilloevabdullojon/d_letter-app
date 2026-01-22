-- CreateTable
CREATE TABLE "CommentEdit" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "oldText" TEXT NOT NULL,
    "newText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentEdit_commentId_idx" ON "CommentEdit"("commentId");

-- CreateIndex
CREATE INDEX "CommentEdit_editorId_idx" ON "CommentEdit"("editorId");

-- AddForeignKey
ALTER TABLE "CommentEdit" ADD CONSTRAINT "CommentEdit_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentEdit" ADD CONSTRAINT "CommentEdit_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
