-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN     "subtask_id" TEXT;

-- CreateIndex
CREATE INDEX "schedule_slots_subtask_id_idx" ON "schedule_slots"("subtask_id");

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
