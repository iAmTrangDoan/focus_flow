ALTER TABLE "schedule_slots" ADD COLUMN "logical_date" DATE;

UPDATE "schedule_slots" SET "logical_date" = "start_at"::date;

ALTER TABLE "schedule_slots" ALTER COLUMN "logical_date" SET NOT NULL;