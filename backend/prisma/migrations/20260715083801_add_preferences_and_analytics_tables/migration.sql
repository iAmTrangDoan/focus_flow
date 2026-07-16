-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('SCHEDULED', 'FROZEN_OVERDUE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RestructureStrategy" AS ENUM ('NONE', 'SHIFT_TIME', 'TRIM_SUBTASKS');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('TASK_CREATED', 'TASK_COMPLETED', 'TASK_DELAYED', 'TASK_DROPPED', 'TASK_STARTED_LATE', 'TASK_RESCHEDULED', 'DEADLINE_MISSED', 'POMODORO_COMPLETED', 'POMODORO_PAUSED', 'POMODORO_DROPPED', 'RESCHEDULE_PENALTY');

-- CreateEnum
CREATE TYPE "ProcrastinationClassification" AS ENUM ('GOOD', 'MEDIUM', 'NEEDS_INTERVENTION');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('PENDING', 'GENERATED', 'FAILED');

-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN     "restructure_strategy" "RestructureStrategy" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "status" "SlotStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" TEXT NOT NULL,
    "work_start_time" TEXT NOT NULL DEFAULT '09:00',
    "work_end_time" TEXT NOT NULL DEFAULT '18:00',
    "work_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "main_goal" TEXT NOT NULL DEFAULT 'personal_growth',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "behavior_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT,
    "session_id" TEXT,
    "event_type" "EventType" NOT NULL,
    "metadata" JSONB,
    "scheduled_time" TIMESTAMP(3),
    "delay_minutes" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behavior_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "peak_hours" JSONB,
    "risky_hours" JSONB,
    "avg_focus_duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "drop_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "common_drop_reasons" JSONB,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "avg_delay_minutes" DOUBLE PRECISION,
    "avg_reschedule_count" DOUBLE PRECISION,
    "avg_duration_accuracy" DOUBLE PRECISION,
    "is_cold_start" BOOLEAN NOT NULL DEFAULT true,
    "last_calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavior_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procrastination_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "classification" "ProcrastinationClassification" NOT NULL,
    "delay_rate" DOUBLE PRECISION NOT NULL,
    "deadline_miss_rate" DOUBLE PRECISION NOT NULL,
    "task_idle_days" DOUBLE PRECISION NOT NULL,
    "reschedule_frequency" DOUBLE PRECISION NOT NULL,
    "time_duration_accuracy" DOUBLE PRECISION NOT NULL,
    "calculation_version" INTEGER NOT NULL DEFAULT 1,
    "calculated_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procrastination_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "input_summary" JSONB,
    "is_actionable" BOOLEAN NOT NULL DEFAULT false,
    "status" "InsightStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "behavior_logs_user_id_idx" ON "behavior_logs"("user_id");

-- CreateIndex
CREATE INDEX "behavior_logs_task_id_idx" ON "behavior_logs"("task_id");

-- CreateIndex
CREATE INDEX "behavior_logs_event_type_idx" ON "behavior_logs"("event_type");

-- CreateIndex
CREATE INDEX "behavior_logs_occurred_at_idx" ON "behavior_logs"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "behavior_profiles_user_id_key" ON "behavior_profiles"("user_id");

-- CreateIndex
CREATE INDEX "procrastination_scores_user_id_calculated_date_idx" ON "procrastination_scores"("user_id", "calculated_date");

-- CreateIndex
CREATE UNIQUE INDEX "procrastination_scores_user_id_calculated_date_key" ON "procrastination_scores"("user_id", "calculated_date");

-- CreateIndex
CREATE INDEX "ai_insights_user_id_week_start_date_idx" ON "ai_insights"("user_id", "week_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_insights_user_id_week_start_date_key" ON "ai_insights"("user_id", "week_start_date");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_logs" ADD CONSTRAINT "behavior_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_logs" ADD CONSTRAINT "behavior_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_logs" ADD CONSTRAINT "behavior_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pomodoro_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_profiles" ADD CONSTRAINT "behavior_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procrastination_scores" ADD CONSTRAINT "procrastination_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
