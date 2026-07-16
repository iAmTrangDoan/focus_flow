import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const defaultConfigs = [
    // Priority Score weights
    { key: 'priority_weight_urgency', value: '0.25', description: 'Trọng số Urgency (w1)' },
    { key: 'priority_weight_importance', value: '0.25', description: 'Trọng số Importance (w2)' },
    { key: 'priority_weight_deadline_pressure', value: '0.20', description: 'Trọng số DeadlinePressure (w3)' },
    { key: 'priority_weight_energy_fit', value: '0.15', description: 'Trọng số EnergyFit (w4)' },
    { key: 'priority_weight_procrastination_risk', value: '0.15', description: 'Trọng số ProcrastinationRisk (w5)' },
    { key: 'urgency_d_max', value: '14', description: 'Ngưỡng số ngày D_max cho Urgency' },

    // Procrastination Score weights
    { key: 'procrastination_weight_delay_rate', value: '0.25', description: 'Trọng số DelayRate (u1)' },
    { key: 'procrastination_weight_deadline_miss', value: '0.25', description: 'Trọng số DeadlineMissRate (u2)' },
    { key: 'procrastination_weight_idle_days', value: '0.20', description: 'Trọng số TaskIdleDaysNorm (u3)' },
    { key: 'procrastination_weight_reschedule', value: '0.15', description: 'Trọng số RescheduleFrequencyNorm (u4)' },
    { key: 'procrastination_weight_duration_accuracy', value: '0.15', description: 'Trọng số TimeDurationAccuracyNorm (u5)' },
    { key: 'procrastination_idle_max_days', value: '7', description: 'Ngưỡng IDLE_MAX (ngày)' },
    { key: 'procrastination_reschedule_max', value: '3', description: 'Ngưỡng RESCHEDULE_MAX (lần/task)' },
    { key: 'procrastination_period_days', value: '14', description: 'Số ngày của kỳ quan sát' },

    // Pomodoro defaults
    { key: 'pomodoro_standard_work', value: '25', description: 'Thời lượng work Standard (phút)' },
    { key: 'pomodoro_standard_break', value: '5', description: 'Thời lượng break Standard (phút)' },
    { key: 'pomodoro_deep_work', value: '50', description: 'Thời lượng work Deep Focus (phút)' },
    { key: 'pomodoro_deep_break', value: '10', description: 'Thời lượng break Deep Focus (phút)' },
];

async function main() {
    console.log('Seeding system_configs...');

    for (const config of defaultConfigs) {
        await prisma.systemConfig.upsert({
            where: { key: config.key },
            update: {}, // Không overwrite nếu đã tồn tại
            create: config,
        });
    }

    console.log(`Seeded ${defaultConfigs.length} config entries.`);

    // Backfill user preferences for users who do not have them
    console.log('Backfilling user preferences for existing users...');
    const usersWithoutPrefs = await prisma.user.findMany({
        where: {
            preference: {
                is: null,
            },
        },
    });

    let backfilledCount = 0;
    for (const u of usersWithoutPrefs) {
        await prisma.userPreference.create({
            data: {
                userId: u.id,
                workStartTime: '08:00',
                workEndTime: '22:00',
                workDays: [1, 2, 3, 4, 5, 6, 7],
                mainGoal: 'personal_growth',
            },
        });
        backfilledCount++;
    }
    console.log(`Backfilled preferences for ${backfilledCount} users.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

