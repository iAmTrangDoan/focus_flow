-- RenameIndex
ALTER INDEX "idx_pomodoro_slot_fk" RENAME TO "pomodoro_sessions_schedule_slot_id_idx";

-- RenameIndex
ALTER INDEX "idx_schedule_slots_due_scheduled" RENAME TO "schedule_slots_start_at_idx";
