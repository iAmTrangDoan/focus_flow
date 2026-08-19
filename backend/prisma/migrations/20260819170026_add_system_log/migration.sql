-- CreateEnum
CREATE TYPE "SystemLogCategory" AS ENUM ('API', 'SCHEDULER', 'ANALYTICS', 'CRON', 'AI', 'ADMIN');

-- CreateEnum
CREATE TYPE "SystemLogStatus" AS ENUM ('STARTED', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "category" "SystemLogCategory" NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "SystemLogStatus" NOT NULL,
    "user_id" TEXT,
    "admin_id" TEXT,
    "source" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_logs_category_idx" ON "system_logs"("category");

-- CreateIndex
CREATE INDEX "system_logs_event_type_idx" ON "system_logs"("event_type");

-- CreateIndex
CREATE INDEX "system_logs_status_idx" ON "system_logs"("status");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");
