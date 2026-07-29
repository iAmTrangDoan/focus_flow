-- AlterTable
ALTER TABLE "public"."behavior_logs" ADD COLUMN     "dedupe_key" TEXT;

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action_type" TEXT,
    "metadata" JSONB,
    "dedupe_key" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "public"."notifications"("dedupe_key" ASC);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "public"."notifications"("user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "public"."notifications"("user_id" ASC, "read" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "behavior_logs_dedupe_key_key" ON "public"."behavior_logs"("dedupe_key" ASC);

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_retry_of_session_id_fkey" FOREIGN KEY ("retry_of_session_id") REFERENCES "public"."pomodoro_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."pomodoro_sessions_schedule_slot_id_idx" RENAME TO "idx_pomodoro_slot_fk";

-- RenameIndex
ALTER INDEX "public"."schedule_slots_start_at_idx" RENAME TO "idx_schedule_slots_due_scheduled";

