-- CreateIndex
CREATE INDEX "schedule_slots_user_id_logical_date_idx" ON "schedule_slots"("user_id", "logical_date");
