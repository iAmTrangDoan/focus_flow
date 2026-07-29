-- DropForeignKey
ALTER TABLE "schedule_slots" DROP CONSTRAINT "schedule_slots_subtask_id_fkey";

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "subtasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
