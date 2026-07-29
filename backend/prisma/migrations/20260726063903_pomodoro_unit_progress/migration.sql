-- AlterTable
ALTER TABLE "pomodoro_sessions" ADD COLUMN     "accumulated_active_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "drop_details" TEXT,
ADD COLUMN     "last_resumed_at" TIMESTAMP(3),
ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "retry_of_session_id" TEXT,
ADD COLUMN     "schedule_slot_id" TEXT,
ADD COLUMN     "subtask_id" TEXT;

-- CreateIndex
CREATE INDEX "pomodoro_sessions_subtask_id_idx" ON "pomodoro_sessions"("subtask_id");

-- CreateIndex
CREATE INDEX "pomodoro_sessions_schedule_slot_id_idx" ON "pomodoro_sessions"("schedule_slot_id");

-- CreateIndex
CREATE INDEX "pomodoro_sessions_retry_of_session_id_idx" ON "pomodoro_sessions"("retry_of_session_id");

-- AddForeignKey
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "subtasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_schedule_slot_id_fkey" FOREIGN KEY ("schedule_slot_id") REFERENCES "schedule_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tạo index đảm bảo 1 user chỉ có 1 session active tại một thời điểm
CREATE UNIQUE INDEX IF NOT EXISTS "pomodoro_sessions_one_active_per_user"
ON "pomodoro_sessions" ("user_id")
WHERE "status" IN ('IN_PROGRESS', 'PAUSED');
