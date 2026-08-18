-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Importance" ADD VALUE 'CRITICAL';
ALTER TYPE "Importance" ADD VALUE 'MEDIUM';

-- AlterTable
ALTER TABLE "subtasks" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT,
    "subtask_id" TEXT,
    "uploaded_session_id" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attachments_task_id_idx" ON "attachments"("task_id");

-- CreateIndex
CREATE INDEX "attachments_subtask_id_idx" ON "attachments"("subtask_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
