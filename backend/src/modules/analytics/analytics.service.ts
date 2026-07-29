import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventType, Prisma, ProcrastinationClassification } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
        private readonly notificationGateway: NotificationGateway,
    ) {}

    // ─── PROCRASTINATION SCORE ──────────────────────────────────


    async getProcrastinationScore(userId: string, date: string) {
        const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        let targetDate: Date;
        if (match) {
            const [, y, m, d] = match;
            targetDate = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
        } else {
            targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
        }

        // Tìm score đã có sẵn
        const existing = await this.prisma.procrastinationScore.findUnique({
            where: {
                userId_calculatedDate: { userId, calculatedDate: targetDate },
            },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (existing && targetDate.getTime() !== today.getTime()) {
            return this.formatScoreResult(existing);
        }

        // Ngày hiện tại luôn được tính lại 
        return this.calculateAndSave(userId, targetDate);
    }


    // Tính toán Procrastination Score từ behavior_logs 

    private async calculateAndSave(userId: string, targetDate: Date) {
        const weights = await this.loadWeights();

        // Snapshot của ngày hiện tại dùng dữ liệu đến thời điểm gọi API.
        // Snapshot ngày quá khứ dùng hết ngày đó 

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const observationEnd =
            targetDate.getTime() === todayStart.getTime()
                ? new Date()
                : new Date(
                      targetDate.getFullYear(),
                      targetDate.getMonth(),
                      targetDate.getDate(),
                      23,
                      59,
                      59,
                      999,
                  );

        const periodDays = weights.periodDays;
        const periodStart = new Date(observationEnd);
        periodStart.setDate(periodStart.getDate() - periodDays);
        periodStart.setHours(0, 0, 0, 0);

        const [logs, tasks, dueSlotCount, deadlineTasks] = await Promise.all([
            this.prisma.behaviorLog.findMany({
                where: {
                    userId,
                    occurredAt: { gte: periodStart, lte: observationEnd },
                },
            }),
            this.prisma.task.findMany({
                where: {
                    userId,
                    createdAt: { lte: observationEnd },
                    OR: [
                        { status: { not: 'DONE' } },
                        { completedAt: { gte: periodStart } },
                    ],
                },
            }),
            this.prisma.scheduleSlot.count({
                where: {
                    userId,
                    startAt: { gte: periodStart, lte: observationEnd },
                },
            }),
            this.prisma.task.findMany({
                where: {
                    userId,
                    deadline: { gte: periodStart, lte: observationEnd },
                },
                select: { id: true },
            }),
        ]);


        // 1. Delay Rate: số slot bị đóng băng / tổng slot đã đến giờ.
        // Chỉ dùng TASK_DELAYED để không đếm đôi nếu PomodoroService còn ghi
        // thêm TASK_STARTED_LATE khi người dùng bắt đầu muộn.
        const delayedSlotCount = logs.filter(
            (log) => log.eventType === EventType.TASK_DELAYED,
        ).length;
        const delayRate = dueSlotCount > 0
            ? (Math.min(delayedSlotCount, dueSlotCount) / dueSlotCount) * 100
            : 0;


        // 2. Deadline Miss Rate: chỉ xét các task có deadline nằm trong kỳ quan sát.
        // Numerator đếm theo taskId duy nhất, không đếm số lần cron chạy.
        const missedTaskIds = new Set(
            logs
                .filter((log) => log.eventType === EventType.DEADLINE_MISSED)
                .map((log) => log.taskId)
                .filter((taskId): taskId is string => Boolean(taskId)),
        );
        const missedDeadlines = deadlineTasks.filter((task) =>
            missedTaskIds.has(task.id),
        ).length;
        const deadlineMissRate = deadlineTasks.length > 0
            ? (missedDeadlines / deadlineTasks.length) * 100
            : 0;


        // 3. Task Idle Days: trung bình số ngày task nằm im sau khi được tạo
        const now = observationEnd.getTime();
        const idleDaysArr = tasks
            .filter(t => t.status !== 'DONE')
            .map(t => {
                const lastActivity = logs
                    .filter(l => l.taskId === t.id)
                    .map(l => l.occurredAt.getTime())
                    .sort((a, b) => b - a)[0];
                const fallbackActivity = Math.max(
                    t.createdAt.getTime(),
                    t.updatedAt.getTime(),
                );
                const effectiveLastActivity = Math.max(
                    lastActivity ?? 0,
                    fallbackActivity,
                );
                return Math.max(
                    0,
                    (now - effectiveLastActivity) / (1000 * 60 * 60 * 24),
                );
            });
        const avgIdleDays = idleDaysArr.length > 0
            ? idleDaysArr.reduce((s, d) => s + d, 0) / idleDaysArr.length
            : 0;
        const idleMax = weights.idleMaxDays;
        const taskIdleDays = Math.min((avgIdleDays / idleMax) * 100, 100);

        // 4. Reschedule Frequency: tần suất bấm "Tái cấu trúc" hoặc đổi lịch
        const rescheduleLogs = logs.filter(l => l.eventType === EventType.TASK_RESCHEDULED || l.eventType === EventType.RESCHEDULE_PENALTY);
        const rescheduleMax = weights.rescheduleMax;
        const rescheduleFrequency = Math.min((rescheduleLogs.length / rescheduleMax) * 100, 100);

        // 5. Time Duration Accuracy: độ chính xác ước lượng thời gian Pomodoro
        const pomodoroSessions = await this.prisma.pomodoroSession.findMany({
            where: {
                userId,
                status: 'COMPLETED',
                startedAt: { gte: periodStart, lte: observationEnd },
                actualDuration: { not: null },
            },
        });
        let timeDurationAccuracy = 80; // mặc định fallback
        if (pomodoroSessions.length > 0) {
            const accuracies = pomodoroSessions.map(s => {
                const planned = s.plannedDuration;
                const actual = s.actualDuration ?? planned;
                return 1 - Math.abs(actual - planned) / planned;
            });
            timeDurationAccuracy = (accuracies.reduce((sum, a) => sum + Math.max(0, a), 0) / accuracies.length) * 100;
        }

        // ─── Tính Procrastination Score (0–100) ────────────────
        // Mỗi chỉ số đã normalized về [0, 100]; nhân trọng số và cộng lại
        // Lưu ý: timeDurationAccuracy cao là TỐT, cần đảo nghịch khi tính điểm trừ
        const score = Math.min(100, Math.max(0,
            weights.u1 * delayRate +
            weights.u2 * deadlineMissRate +
            weights.u3 * taskIdleDays +
            weights.u4 * rescheduleFrequency +
            weights.u5 * (100 - timeDurationAccuracy)
        ));

        const classification = this.classify(score);

        // Upsert vào DB
        const saved = await this.prisma.procrastinationScore.upsert({
            where: {
                userId_calculatedDate: { userId, calculatedDate: targetDate },
            },
            create: {
                userId,
                score: Math.round(score * 10) / 10,
                classification,
                delayRate: Math.round(delayRate * 10) / 10,
                deadlineMissRate: Math.round(deadlineMissRate * 10) / 10,
                taskIdleDays: Math.round(taskIdleDays * 10) / 10,
                rescheduleFrequency: Math.round(rescheduleFrequency * 10) / 10,
                timeDurationAccuracy: Math.round(timeDurationAccuracy * 10) / 10,
                calculatedDate: targetDate,
            },
            update: {
                score: Math.round(score * 10) / 10,
                classification,
                delayRate: Math.round(delayRate * 10) / 10,
                deadlineMissRate: Math.round(deadlineMissRate * 10) / 10,
                taskIdleDays: Math.round(taskIdleDays * 10) / 10,
                rescheduleFrequency: Math.round(rescheduleFrequency * 10) / 10,
                timeDurationAccuracy: Math.round(timeDurationAccuracy * 10) / 10,
            },
        });

        return this.formatScoreResult(saved);
    }

    private formatScoreResult(saved: any) {
        const classMap: Record<string, string> = {
            GOOD: 'Tốt',
            MEDIUM: 'Trung bình',
            NEEDS_INTERVENTION: 'Cần can thiệp',
        };

        return {
            score: saved.score,
            classification: classMap[saved.classification] ?? saved.classification,
            breakdown: {
                delayRate: saved.delayRate,
                deadlineMissRate: saved.deadlineMissRate,
                taskIdleDays: saved.taskIdleDays,
                rescheduleFrequency: saved.rescheduleFrequency,
                timeDurationAccuracy: saved.timeDurationAccuracy,
            },
            calculatedDate: saved.calculatedDate,
        };
    }

    private classify(score: number): ProcrastinationClassification {
        if (score <= 30) return ProcrastinationClassification.GOOD;
        if (score <= 60) return ProcrastinationClassification.MEDIUM;
        return ProcrastinationClassification.NEEDS_INTERVENTION;
    }

    // ─── OVERDUE DEADLINE + DAILY SNAPSHOT ─────────────────────

    /**
     * Luồng 2: phát hiện task đã qua deadline nhưng chưa DONE.
     * Task vẫn giữ TODO/IN_PROGRESS; chỉ ghi DEADLINE_MISSED một lần và notify.
     */
    @Cron('30 */5 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) //chạy giây thứ 30, mỗi 5p 1 lần
    
    async detectMissedDeadlines(): Promise<{ detectedCount: number }> {
        const now = new Date();
        const overdueTasks = await this.prisma.task.findMany({
            where: {
                deadline: { lt: now },
                status: { in: ['TODO', 'IN_PROGRESS'] },
                user: { isActive: true },
                behaviorLogs: {
                    none: { eventType: EventType.DEADLINE_MISSED },
                },
            },
            select: {
                id: true,
                userId: true,
                title: true,
                deadline: true,
            },
            orderBy: { deadline: 'asc' },
            take: 2_000,
        });

        if (overdueTasks.length === 0) return { detectedCount: 0 };

        const newlyMissed = overdueTasks;
        if (newlyMissed.length === 0) return { detectedCount: 0 };

        const insertedLogs = await this.prisma.behaviorLog.createMany({
            data: newlyMissed.map((task) => ({
                userId: task.userId,
                taskId: task.id,
                eventType: EventType.DEADLINE_MISSED,
                scheduledTime: task.deadline,
                delayMinutes: Math.max(
                    0,
                    Math.floor(
                        (now.getTime() - task.deadline!.getTime()) / 60_000,
                    ),
                ),
                occurredAt: now,
                dedupeKey: `deadline-missed:${task.id}`,
                metadata: {
                    source: 'DEADLINE_MISS_CRON',
                    taskTitle: task.title,
                } as Prisma.InputJsonValue,
            })),
            skipDuplicates: true,
        });

        if (insertedLogs.count === 0) return { detectedCount: 0 };

        const byUser = new Map<string, typeof newlyMissed>();
        for (const task of newlyMissed) {
            const list = byUser.get(task.userId) ?? [];
            list.push(task);
            byUser.set(task.userId, list);
        }

        await Promise.all(
            [...byUser.entries()].map(async ([userId, tasks]) => {
                const first = tasks[0];
                const description = tasks.length === 1
                    ? `“${first.title}” đã qua hạn. Công việc vẫn được giữ nguyên và sẽ được ưu tiên ở lần lập lịch tiếp theo.`
                    : `Có ${tasks.length} công việc đã qua hạn. Các công việc vẫn được giữ nguyên và sẽ được ưu tiên khi lập lịch.`;

                await this.notificationService.createNotification(
                    userId,
                    'productivity',
                    tasks.length === 1
                        ? 'Một công việc đã quá hạn'
                        : `${tasks.length} công việc đã quá hạn`,
                    description,
                    'view_details',
                    {
                        metadata: {
                            type: 'TASK_DEADLINE_MISSED',
                            taskIds: tasks.map((task) => task.id),
                        },
                        dedupeKey: `deadline-missed-batch:${userId}:${tasks[0].id}:${tasks.length}`,
                    },
                );

                this.notificationGateway.emitToUser(
                    userId,
                    'task_deadlines_missed',
                    {
                        tasks: tasks.map((task) => ({
                            taskId: task.id,
                            title: task.title,
                            deadline: task.deadline,
                            delayMinutes: Math.max(
                                0,
                                Math.floor(
                                    (now.getTime() - task.deadline!.getTime()) /
                                        60_000,
                                ),
                            ),
                        })),
                        occurredAt: now,
                    },
                );
            }),
        );

        this.logger.log(`Recorded ${insertedLogs.count} new deadline miss(es).`);
        return { detectedCount: insertedLogs.count };
    }

    /**
     * Chạy 00:10 mỗi ngày để tính điểm trì hoãn
     * 
     */
    @Cron('0 10 0 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
    async calculateDailySnapshots(): Promise<void> {
        const snapshotDate = new Date();
        snapshotDate.setDate(snapshotDate.getDate() - 1);
        snapshotDate.setHours(0, 0, 0, 0);

        const users = await this.prisma.user.findMany({
            where: { isActive: true, role: 'USER' },
            select: { id: true },
        });

        for (const user of users) {
            try {
                const result = await this.calculateAndSave(
                    user.id,
                    snapshotDate,
                );

                this.notificationGateway.emitToUser(
                    user.id,
                    'analytics_updated',
                    {
                        type: 'DAILY_PROCRASTINATION_SCORE',
                        calculatedDate: result.calculatedDate,
                        score: result.score,
                        classification: result.classification,
                    },
                );

                if (result.score > 60) {
                    const dateKey = snapshotDate.toISOString().split('T')[0];
                    await this.notificationService.createNotification(
                        user.id,
                        'productivity',
                        'Nên điều chỉnh kế hoạch làm việc',
                        `Điểm trì hoãn ngày ${dateKey} là ${result.score}/100. Hãy xem các yếu tố ảnh hưởng và điều chỉnh lịch vừa sức hơn.`,
                        'view_details',
                        {
                            metadata: {
                                type: 'PROCRASTINATION_INTERVENTION',
                                calculatedDate: dateKey,
                                score: result.score,
                            },
                            dedupeKey: `procrastination-intervention:${user.id}:${dateKey}`,
                        },
                    );
                }
            } catch (error) {
                this.logger.error(
                    `Daily analytics failed for user ${user.id}: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                );
            }
        }
    }

    /**
     * Dữ liệu tổng hợp để frontend hiển thị badge/dashboard quá hạn.
     */
    async getOverdueSummary(userId: string) {
        const now = new Date();
        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 14);

        const [frozenSlots, overdueTasks, delayLogs, deadlineLogs, latestScore] =
            await Promise.all([
                this.prisma.scheduleSlot.count({
                    where: {
                        userId,
                        status: 'FROZEN_OVERDUE',
                        isCompleted: false,
                    },
                }),
                this.prisma.task.count({
                    where: {
                        userId,
                        deadline: { lt: now },
                        status: { in: ['TODO', 'IN_PROGRESS'] },
                    },
                }),
                this.prisma.behaviorLog.findMany({
                    where: {
                        userId,
                        eventType: EventType.TASK_DELAYED,
                        occurredAt: { gte: periodStart, lte: now },
                    },
                    select: { delayMinutes: true },
                }),
                this.prisma.behaviorLog.count({
                    where: {
                        userId,
                        eventType: EventType.DEADLINE_MISSED,
                        occurredAt: { gte: periodStart, lte: now },
                    },
                }),
                this.prisma.procrastinationScore.findFirst({
                    where: { userId },
                    orderBy: { calculatedDate: 'desc' },
                }),
            ]);

        const validDelays = delayLogs
            .map((log) => log.delayMinutes)
            .filter((value): value is number => value != null);

        return {
            current: {
                frozenSlotCount: frozenSlots,
                overdueTaskCount: overdueTasks,
            },
            last14Days: {
                delayedSlotCount: delayLogs.length,
                deadlineMissCount: deadlineLogs,
                averageSlotDelayMinutes:
                    validDelays.length > 0
                        ? Math.round(
                              validDelays.reduce((sum, value) => sum + value, 0) /
                                  validDelays.length,
                          )
                        : 0,
            },
            latestProcrastinationScore: latestScore
                ? this.formatScoreResult(latestScore)
                : null,
            generatedAt: now,
        };
    }

    // ─── COMPLETION RATE ────────────────────────────────────────

    /**
     * Thống kê tỷ lệ hoàn thành task theo ngày trong khoảng date range.
     * Mặc định: 7 ngày gần nhất (tuần hiện tại).
     */
    async getCompletionRate(userId: string, range: 'this_week' | 'last_week' | 'this_month') {
        const { start, end } = this.getRangeDates(range);

        const tasks = await this.prisma.task.findMany({
            where: {
                userId,
                createdAt: { lte: end },
                OR: [
                    { deadline: { gte: start, lte: end } },
                    { createdAt: { gte: start, lte: end } },
                ],
            },
        });

        // Nhóm theo ngày
        const days: Record<string, { total: number; completed: number }> = {};

        // Tạo tất cả các ngày trong range
        const cursor = new Date(start);
        while (cursor <= end) {
            const key = cursor.toISOString().split('T')[0];
            days[key] = { total: 0, completed: 0 };
            cursor.setDate(cursor.getDate() + 1);
        }

        for (const task of tasks) {
            const taskDate = (task.deadline || task.createdAt).toISOString().split('T')[0];
            if (days[taskDate]) {
                days[taskDate].total += 1;
                if (task.status === 'DONE') {
                    days[taskDate].completed += 1;
                }
            }
        }

        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        return Object.entries(days).map(([date, stats]) => {
            const d = new Date(date);
            return {
                day: dayNames[d.getDay()],
                date,
                rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
                completed: stats.completed,
                total: stats.total,
            };
        });
    }

    /**
     * Thống kê completion rate theo tuần (số task hoàn thành / tổng task, theo tuần).
     */
    async getWeeklyProductivity(userId: string) {
        // Lấy 5 tuần gần nhất
        const results: { week: string; completed: number; total: number }[] = [];
        const now = new Date();

        for (let i = 4; i >= 0; i--) {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - i * 7);
            weekEnd.setHours(23, 59, 59, 999);

            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 6);
            weekStart.setHours(0, 0, 0, 0);

            const tasks = await this.prisma.task.findMany({
                where: {
                    userId,
                    createdAt: { gte: weekStart, lte: weekEnd },
                },
            });

            const weekNum = this.getISOWeek(weekStart);
            results.push({
                week: `Tuần ${weekNum}`,
                completed: tasks.filter(t => t.status === 'DONE').length,
                total: tasks.length,
            });
        }

        return results;
    }

    // ─── HEATMAP ────────────────────────────────────────────────

    /**
     * Tổng hợp số phiên Pomodoro hoàn thành theo giờ và ngày trong tuần.
     * Dùng để vẽ heatmap hiệu suất.
     */
    async getHeatmap(userId: string) {
        // 30 ngày gần nhất
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const sessions = await this.prisma.pomodoroSession.findMany({
            where: {
                userId,
                status: 'COMPLETED',
                startedAt: { gte: start, lte: end },
            },
        });

        // day (0=CN, 1=T2…) + hour → count
        const heatmap: Record<string, number> = {};
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        for (const session of sessions) {
            const day = dayNames[session.startedAt.getDay()];
            const hour = session.startedAt.getHours();
            const key = `${day}_${hour}`;
            heatmap[key] = (heatmap[key] ?? 0) + 1;
        }

        // Flatten thành mảng để client render dễ dàng
        const result: { day: string; hour: number; value: number }[] = [];
        for (const day of dayNames) {
            for (let hour = 7; hour <= 22; hour++) {
                result.push({
                    day,
                    hour,
                    value: heatmap[`${day}_${hour}`] ?? 0,
                });
            }
        }

        return result;
    }

    // ─── ADMIN DASHBOARD ────────────────────────────────────────

    /**
     * Procrastination Score trung bình hệ thống (cho Admin dashboard).
     */
    async getAvgSystemProcrastinationScore(): Promise<number | null> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await this.prisma.procrastinationScore.aggregate({
            _avg: { score: true },
            where: {
                calculatedDate: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
            },
        });

        return result._avg.score ? Math.round(result._avg.score * 10) / 10 : null;
    }

    // ─── HELPERS ────────────────────────────────────────────────

    private async loadWeights() {
        const configs = await this.prisma.systemConfig.findMany({
            where: {
                key: {
                    in: [
                        'procrastination_weight_delay_rate',
                        'procrastination_weight_deadline_miss',
                        'procrastination_weight_idle_days',
                        'procrastination_weight_reschedule',
                        'procrastination_weight_duration_accuracy',
                        'procrastination_period_days',
                        'procrastination_idle_max_days',
                        'procrastination_reschedule_max',
                    ],
                },
            },
        });

        const map = new Map(configs.map(c => [c.key, c.value]));
        return {
            u1: parseFloat(map.get('procrastination_weight_delay_rate') ?? '0.25'),
            u2: parseFloat(map.get('procrastination_weight_deadline_miss') ?? '0.25'),
            u3: parseFloat(map.get('procrastination_weight_idle_days') ?? '0.20'),
            u4: parseFloat(map.get('procrastination_weight_reschedule') ?? '0.15'),
            u5: parseFloat(map.get('procrastination_weight_duration_accuracy') ?? '0.15'),
            periodDays: parseInt(map.get('procrastination_period_days') ?? '14', 10),
            idleMaxDays: parseInt(map.get('procrastination_idle_max_days') ?? '7', 10),
            rescheduleMax: parseInt(map.get('procrastination_reschedule_max') ?? '3', 10),
        };
    }

    private getRangeDates(range: 'this_week' | 'last_week' | 'this_month') {
        const now = new Date();
        let start: Date, end: Date;

        if (range === 'this_week') {
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            start = new Date(now);
            start.setDate(now.getDate() + diff);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'last_week') {
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            end = new Date(now);
            end.setDate(now.getDate() + diff - 1);
            end.setHours(23, 59, 59, 999);
            start = new Date(end);
            start.setDate(end.getDate() - 6);
            start.setHours(0, 0, 0, 0);
        } else {
            // this_month
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        return { start, end };
    }

    private getISOWeek(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    


}

